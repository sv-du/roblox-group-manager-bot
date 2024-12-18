const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const createSocialLinkCoolDowns = new Set();

class Log {
    authorID;
    typeOfSocialLink;
    title;
    url;
    type;
    caseNum;

    constructor(authorID, typeOfSocialLink, title, url, type, caseNum) {
        this.authorID = authorID;
        this.typeOfSocialLink = typeOfSocialLink;
        this.title = title;
        this.url = url;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function createSocialLink(groupID, title, type, url) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();
    let body = {
        "type": type,
        "url": url,
        "title": title
    }

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/social-links`,
        method: "POST",
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

    if(createSocialLinkCoolDowns.has(message.author.id)) {
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

    let type = args[0];
    if(!type) {
        return message.channel.send(embedMaker("No Type Supplied", "You didn't supply a type of social link for me to create on the group"));
    }
    
    if(type !== "Facebook") {
        if(type !== "Twitter") {
            if(type !== "Youtube") {
                if(type !== "Twitch") {
                    if(type !== "Discord") {
                        return message.channel.send(embedMaker("Invalid Type", `The type of social link that you supplied isn't valid`));
                    }
                }
            }
        }
    }

    let url = args[1];
    if(!url) {
        return message.channel.send(embedMaker("No URL Supplied", `You didn't supply a url for me to attach to the social link`));
    }

    let title = args.splice(2).join(" ");
    if(!title) {
        return message.channel.send(embedMaker("No Title Supplied", `You didn't supply the title of the social link`));
    }

    try {
        await createSocialLink(configFile.groupID, title, type, url);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to create the social link for the group: ${err.response.data[0].userFacingMessage}`));
    }

    message.channel.send(embedMaker("Success", `You have successfully created a social link with the infomation supplied for the group`));
    createSocialLinkCoolDowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);
        if(!channel) {
            message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        } else {
            let logDatabase = await db.get("logs") || [];
            let caseNumDatabase = await db.get("caseNum") || 1;
            let newLogObject = new Log(message.author.id, type, title, url, "CreateSocialLink", caseNumDatabase);

            logDatabase.push(newLogObject);
            caseNumDatabase++;
            await db.set("caseNum", caseNumDatabase);
            await db.set("logs", logDatabase);

            let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
            embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Type of Social Link**: ${newLogObject.typeOfSocialLink}\n**Title of Social Link**: ${newLogObject.title}\n**URL of Social Link**: ${newLogObject.url}\n**Case Number**: ${newLogObject.caseNum}`);
            channel.send(embed);
            message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
        }
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        createSocialLinkCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**createsociallink <type> <url> <title>**";
    let description = "Creates a social link for the linked group. Valid types are Facebook, Twitter, Youtube, Twitch, and Discord";
    return `${name} - ${description}\n`;
}