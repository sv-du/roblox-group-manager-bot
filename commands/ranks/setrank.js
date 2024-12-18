const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const setRankCoolDowns = new Set();

class Log {
    authorID;
    authorRBXID;
    userID;
    oldRankID;
    type;
    caseNum;

    constructor(authorID, authorRBXID, userID, oldRankID, type, caseNum) {
        this.authorID = authorID;
        this.authorRBXID = authorRBXID;
        this.userID = userID;
        this.oldRankID = oldRankID;
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

    if(setRankCoolDowns.has(message.author.id)) {
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
    let canUserManageRanks = userPermissions.groupMembershipPermissions.changeRank;

    if(canUserManageRanks == false) {
        return message.channel.send(embedMaker("No permission", `Your Roblox account doesn't have permission to manage user's ranks`));
    }

    let username = args[0];
    if(!username) {
        return message.channel.send(embedMaker('No Username Supplied', "You didn't supply a username for me to change the rank of"));
    }
    let rbxID
    try {
        rbxID = await roblox.getIdFromUsername(username);
    } catch {
        return message.channel.send(embedMaker('Invalid Username', "The username that you supplied isn't a valid Roblox username"));
    }
    if(authorID == rbxID) {
        return message.channel.send(embedMaker("Error", `You just attempted to do a group action on yourself, which isn't allowed. Why do you think there's verification in place?`));
    }
    username = await roblox.getUsernameFromId(rbxID);
    let newRankID = Number(args[1]);
    if(!newRankID) {
        return message.channel.send(embedMaker('No Rank ID Supplied', "You didn't supply a rank ID for me to rank this user to"));
    }
    if(isNaN(newRankID)) {
        return message.channel.send(embedMaker('Invalid Rank ID Supplied', "You didn't suppy a valid rank ID cause the one you gave isn't a number"));
    }
    let oldRankID = await roblox.getRankInGroup(configFile.groupID, rbxID);
    let oldRankName = await roblox.getRankNameInGroup(configFile.groupID, rbxID);
    try {
        await roblox.setRank(configFile.groupID, rbxID, newRankID);
    } catch (err) {
        return message.channel.send(embedMaker('Error', `There was an error while attempting to rank ${username} from ${oldRankName} (${oldRankID}): ${err}`));
    }
    let newRankName = await roblox.getRankNameInGroup(configFile.groupID, rbxID);
    message.channel.send(embedMaker("Success", `You have successfully ranked ${username} from ${oldRankName} (${oldRankID}) to ${newRankName} (${newRankID})`));
    setRankCoolDowns.add(message.author.id);
    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, authorID, rbxID, oldRankID, "SetRank", caseNumDatabase);
            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);
            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Roblox Username of Author**: ${await roblox.getUsernameFromId(newLogObject.authorRBXID)}\n**Roblox ID of Author**: ${newLogObject.authorRBXID}\n**Roblox Username of User**: ${await roblox.getUsernameFromId(newLogObject.userID)}\n**Roblox ID of User**: ${newLogObject.userID}\n**Old Rank Name**: ${oldRankName}\n**Old Rank ID**: ${oldRankID}\n**New Rank Name**: ${newRankName}\n**New Rank ID**: ${newRankID}\n**Type**: ${newLogObject.type}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }
    if(configFile.messagingEnabled == true) {
        let groupName = (await roblox.getGroup(configFile.groupID)).name
        let didError = false;
        let r = await sendUser(rbxID, "Change Rank", `Your rank in the group ${groupName} has been changed from ${oldRankName} (${oldRankID}) to ${newRankName} (${newRankID}) by ${await roblox.getUsernameFromId(authorID)} (${authorID})`);
        if(r.data.success == false) {
            didError = true;
        }
        if(didError == true) {
            message.channel.send(embedMaker('Error', `Due to the bot's settings in the configuration file, the bot was supposed to message this user on Roblox about this action, but there was an error: ${r.data.message}`));
        } else {
            message.channel.send(embedMaker('Sent', `Due to the bot's settings in the configuration file, this action was reported to the user in question on Roblox via DMs`));
        }
    } else {
        message.channel.send(embedMaker('Not Sent', "Due to the bot's settings in the configuration file, this action wasn't sent to the user in question on Roblox via DMs"));
    }
    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        setRankCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**setrank <username> <rank id>**";
    let description = "Sets the rank of <username> to <rank id>";
    return `${name} - ${description}\n`;
}