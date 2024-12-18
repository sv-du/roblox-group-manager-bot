const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const acceptAllyRequestCoolDowns = new Set();

class Log {
    authorID;
    authorRBXID;
    acceptedGroupID;
    type;
    caseNum;

    constructor(authorID, authorRBXID, acceptedGroupID, type, caseNum) {
        this.authorID = authorID;
        this.authorRBXID = authorRBXID;
        this.acceptedGroupID = acceptedGroupID;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function sendUser(rbxID, subject, body) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();
    let senderID = await roblox.getSenderUserId();
    let request = await axios({
        url: "https://privatemessages.roblox.com/v1/messages/send",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`
        },
        data: {
            userId: senderID,
            subject: subject,
            body: body,
            recipientId: rbxID,
        }
    });
    return request;
}

async function acceptAllyRequest(groupID) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${configFile.groupID}/relationships/allies/requests/${groupID}`,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`
        }
    });

    return request;
}

/**
* @param {Discord.Message} message
* @param {Discord.Client} client
* @param {String[]} args
*/

exports.run = async(message, client, args) => {

    function embedMaker(title, description) {
        let embed = new Discord.MessageEmbed();
        embed.setColor(configFile.embedColor);
        embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
        embed.setTitle(title);
        embed.setDescription(description);
        embed.setFooter('Command created by zachariapopcorn#8105 - https://discord.gg/XGGpf3q');
        return embed;
    }

    if(acceptAllyRequestCoolDowns.has(message.author.id)) {
        return message.channel.send(embedMaker("Cooldown", `You're on cooldown! Please try to use this command again after ${configFile.cooldown} seconds since the last successful attempt`));
    }

    let verifiedUsers = await db.get("verifiedUsers") || [];
    let isVerified = false;
    let authorID


    for(var i = 0; i < verifiedUsers.length; i++) {
        if(message.author.id === verifiedUsers[i].discordID) {
            isVerified = true;
            authorID = verifiedUsers[i].robloxID;
        }
    }


    if(isVerified == false) {
        return message.channel.send(embedMaker("Verification Required", "You are required to verify your Roblox account with your Discord account in order to continue. If you wish to verify, please run the verify command"));
    }

    let isAllowed = false;
    for(var i = 0; i < allowedRanks.length; i++) {
        if(message.member.roles.cache.some(role => [allowedRanks[i]].includes(role.name))) {
            isAllowed = true;
        }
    }

    if(isAllowed == false) {
        return message.channel.send(embedMaker('No permission', "You don't have permission to use this command!"));
    }

    let usersRank = await roblox.getRankInGroup(configFile.groupID, authorID);
    let userRankObject = await roblox.getRole(configFile.groupID, usersRank);
    let userPermissions = (await roblox.getRolePermissions(configFile.groupID, userRankObject.ID)).permissions;
    let canUserManagePartners = userPermissions.groupManagementPermissions.manageRelationships;

    if(canUserManagePartners == false) {
        return message.channel.send(embedMaker("No permission", `Your Roblox account doesn't have the permission to manage partnerships!`));
    }

    let groupID = Number(args[0]);

    if(!groupID) {
        return message.channel.send(embedMaker("No Group ID Supplied", `You didn't supply a group id for me to accept the ally reuqest of or the group id that you supplied isn't a number`));
    }

    try {
        await acceptAllyRequest(groupID)
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to accept the ally request of this group: ${err.response.data[0].userFacingMessage}`));
    }

    message.channel.send(embedMaker("Success", `You have successfully accepted the ally request of the group with the id of ${groupID}`));
    acceptAllyRequestCoolDowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, authorID, groupID, "AcceptAllyRequest", caseNumDatabase);

            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);

            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Roblox Username of Author**: ${await roblox.getUsernameFromId(newLogObject.authorRBXID)}\n**Accepted Group ID**: ${newLogObject.acceptedGroupID}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    if(configFile.messagingEnabled == true) {
        let groupName = (await roblox.getGroup(configFile.groupID)).name
        let userToMessage = (await roblox.getGroup(groupID)).owner.userId;

        let didError = false;
        let r = await sendUser(userToMessage, "Accepted Ally Request", `Your ally request to the group ${groupName} has been accepeted by ${await roblox.getUsernameFromId(authorID)} (${authorID})`);

        if(r.data.success == false) {
            didError = true;
        }

        if(didError == true) {
            message.channel.send(embedMaker('Error', `Due to the bot's settings in the configuration file, the bot was supposed to message the owner of the group in question on Roblox about this action, but there was an error: ${r.data.message}`));
        } else {
            message.channel.send(embedMaker('Sent', `Due to the bot's settings in the configuration file, this action was reported to owner of the group in question on Roblox via DMs`));
        }
    } else {
        message.channel.send(embedMaker('Not Sent', "Due to the bot's settings in the configuration file, this action wasn't sent to the user in question on Roblox via DMs"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        acceptAllyRequestCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**acceptallyrequest <group id>**";
    let description = "Accepts the ally request of <group id>";
    return `${name} - ${description}\n`;
}