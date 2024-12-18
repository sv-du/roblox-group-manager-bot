const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const shoutCooldowns = new Set();

class Log {
    authorID;
    authorRBXID;
    oldShout;
    type;
    caseNum;

    constructor(authorID, authorRBXID, oldShout, type, caseNum) {
        this.authorID = authorID;
        this.authorRBXID = authorRBXID;
        this.oldShout = oldShout;
        this.type = type;
        this.caseNum = caseNum;
    }
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

    if(shoutCooldowns.has(message.author.id)) {
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
    let canUserShout = userPermissions.groupPostsPermissions.postToStatus;

    if(canUserShout == false) {
        return message.channel.send(embedMaker("No permission", `Your Roblox account doesn't have permission to shout`));
    }

    let shoutText = args.splice(0).join(" ");

    let oldShout

    try {
        oldShout = (await roblox.getShout(configFile.groupID)).body;
    } catch (err) {
        message.channel.send(embedMaker("Error", `There was an error while attempting to get the old shout: ${err}. Setting oldShout to an empty string`));
        oldShout = "";
    }

    try {
        await roblox.shout(configFile.groupID, `[Posted by ${await roblox.getUsernameFromId(authorID)}] ${shoutText}`);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to shout the message to the group: ${err}`));
    }

    message.channel.send(embedMaker("Success", `You have successfully shouted to the group`));
    shoutCooldowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, authorID, oldShout, "Shout", caseNumDatabase);
            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);
    
            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Roblox Username of Author**: ${await roblox.getUsernameFromId(newLogObject.authorRBXID)}\n**Roblox ID of Author**: ${newLogObject.authorRBXID}\n**Old Shout**: ${oldShout}\n**New Shout**: ${shoutText}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        shoutCooldowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**shout <text>**";
    let description = "Shouts <text> to the group";
    return `${name} - ${description}\n`;
}