const FormData = require('form-data');
const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const axios = require('axios').default;
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const setLogoCoolDowns = new Set();

class Log {
    authorID;
    type;
    caseNum;

    constructor(aID, type, caseNum) {
        this.authorID = aID;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function setLogo(groupID, image) {
    let token = await roblox.getGeneralToken();
    let fData = new FormData();

    fData.append("files", image);

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/icon?groupId=${groupID}`,
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`,
            ...fData.getHeaders()
        },
        data: fData
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

    if(setLogoCoolDowns.has(message.author.id)) {
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

    if(!message.attachments.first()) {
        return message.channel.send(embedMaker("No Image Supplied", `You didn't supply an image for me to set the group's logo to`));
    }

    let url = message.attachments.first().url;
    let res = await axios({
        url: url,
        method: "GET",
        responseType: "stream"
    });

    let name = message.attachments.first().url.substring(url.lastIndexOf("/") + 1, url.length).toLowerCase();

    res.data.pipe(fs.createWriteStream(name));

    try {
        await setLogo(configFile.groupID, fs.createReadStream(name));
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to set the logo of the group: ${err.response.data[0].userFacingMessage}`));
    }

    fs.unlinkSync(name);
    message.channel.send(embedMaker("Success", `You have successfully set the group logo to the image that you supplied`));
    setLogoCoolDowns.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);

        if(!channel) {
            return message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        }

        let logDatabase = await db.get("logs") || [];
        let caseNumDatabase = await db.get("caseNum") || 1;
        let newLogObject = new Log(message.author.id, "SetLogo", caseNumDatabase);

        logDatabase.push(newLogObject);
        caseNumDatabase++;
        await db.set("caseNum", caseNumDatabase);
        await db.set("logs", logDatabase);

        let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
        embed.addField("Log Information", `**Command Author**: <@${newLogObject.authorID}> (${newLogObject.authorID})\n**Type**: ${newLogObject.type}\n**Case Number**: ${newLogObject.caseNum}`);
        channel.send(embed);
        message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        setLogoCoolDowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**setlogo <new image>**";
    let description = "Changes the group logo to the image supplied";
    return `${name}  - ${description}\n`;
}