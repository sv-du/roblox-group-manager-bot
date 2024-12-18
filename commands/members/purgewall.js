const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const purgeWallCoolDowns = new Set();

class Log {
    authorID;
    userID;
    type;
    caseNum;

    constructor(authorID, userID, type, caseNum) {
        this.authorID = authorID;
        this.userID = userID;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function purgeWall(groupID, userID) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/wall/users/${userID}/posts`,
        method: "DELETE",
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

    if(purgeWallCoolDowns.has(message.author.id)) {
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
    let canUserDeletePosts = userPermissions.groupPostsPermissions.deleteFromWall;

    if(canUserDeletePosts == false) {
        return message.channel.send(embedMaker("No permission", `Your Roblox account doesn't have permission to delete wall posts`));
    }

    let username = args[0];

    if(!username) {
        return message.channel.send(embedMaker("No Username Supplied", `You didn't supply a username for me to purge from the wall`));
    }

    let userID

    try {
        userID = await roblox.getIdFromUsername(username);
    } catch {
        return message.channel.send(embedMaker("Invalid Username", `You didn't supply a valid Roblox username`));
    }

    try {
        await purgeWall(configFile.groupID, userID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to purge this user's messages from the group wall: ${err.response.data[0].userFacingMessage}`));
    }

    message.channel.send(embedMaker("Success", `You have successfully purged's ${await roblox.getUsernameFromId(userID)}'s messages from the group wall`));
    purgeWallCoolDowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, userID, "PurgeWall", caseNumDatabase);

            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);
    
            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Username of Purge**: ${await roblox.getUsernameFromId(newLogObject.userID)}\n**User ID of Purge**: ${newLogObject.userID}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        purgeWallCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**purgewall <username>**";
    let description = "Purges all the group wall posts made by <username>";
    return `${name} - ${description}\n`;
}