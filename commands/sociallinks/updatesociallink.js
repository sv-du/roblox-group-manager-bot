const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const updateSocialLinkCoolDowns = new Set();

class Log {
    authorID;
    socialLinkID;
    typeOfUpdate;
    newText;
    type;
    caseNum;

    constructor(authorID, socialLinkID, typeOfUpdate, newText, type, caseNum) {
        this.authorID = authorID;
        this.socialLinkID = socialLinkID;
        this.typeOfUpdate = typeOfUpdate;
        this.newText = newText;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function getSocialLinks(groupID) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/social-links`,
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`
        }
    });

    return request;
}

async function updateSocialLink(groupID, socialLinkID, typeOfChange, replacement, oldType, oldURL, oldText) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let body;
    
    if(typeOfChange == "url") {
        body = {
            "type": oldType,
            "url": replacement,
            "title": oldText
        }
    } else {
        body = {
            "type": oldType,
            "url": oldURL,
            "title": replacement
        }
    }

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/social-links/${socialLinkID}`,
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`
        },
        data: body
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

    if(updateSocialLinkCoolDowns.has(message.author.id)) {
        return message.channel.send(embedMaker("Cooldown", `You're on cooldown! Please try to use this command again after ${configFile.cooldown} seconds since the last successful attempt`));
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

    let socialLinkID = Number(args[0]);
    if(!socialLinkID) {
        return message.channel.send(embedMaker("No Social Link ID Supplied", `You didn't supply a social link ID for me to update`));
    }

    let type = args[1];
    if(!type) {
        return message.channel.send(embedMaker("No Type Supplied", "You didn't supply a type of change that you want this social link to undergo"));
    }

    type = type.toLowerCase();

    if(type !== "url") {
        if(type !== "title") {
            return message.channel.send(embedMaker("Invalid Type", `The type of change the you requested isn't a valid type`));
        }
    }

    let replacementText = args.splice(2).join(" ");
    if(!replacementText) {
        return message.channel.send(embedMaker("No Replacement Text Supplied", `You didn't supply the replacement text that you wanted to write to this social link`));
    }

    let r

    try {
        r = await getSocialLinks(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to get the group's social links: ${err.response.data[0].userFacingMessage}`));
    }

    let socialLinks = r.data.data;

    let index = -1;

    for(var i = 0; i < socialLinks.length; i++) {
        if(socialLinks[i].id == socialLinkID) {
            index = i;
        }
    }

    if(index == -1) {
        return message.channel.send(embedMaker("Invalid Social Link ID", `The social link ID that you supplied isn't valid`));
    }

    let oldType = socialLinks[index].type;
    let oldURL = socialLinks[index].url;
    let oldText = socialLinks[index].title;

    try {
        await updateSocialLink(configFile.groupID, socialLinkID, type, replacementText, oldType, oldURL, oldText);
    } catch {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to update this social link`));
    }

    message.channel.send(embedMaker("Success", `You have successfully updated the ${type} of the social link with the ID of ${socialLinkID}`));
    updateSocialLinkCoolDowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, socialLinkID, type, replacementText, "UpdateSocialLink", caseNumDatabase);

            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);

            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Updated Social Link ID**: ${newLogObject.socialLinkID}\n**Updated Property of Social Link**: ${newLogObject.typeOfUpdate}\n**Replacement Text**: ${newLogObject.newText}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        updateSocialLinkCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**updatesociallink <social link id> <type of update> <replacement text>. Valid types are url and title**";
    let description = "Updates the social link with <social link id> with replacing <type of update> for <replacement text>";
    return `${name} - ${description}\n`;
}