const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const setDescriptionCoolDown = new Set();

class Log {
    authorID;
    oldDescription;
    type;
    caseNum;

    constructor(aID, oldDescription, type, caseNum) {
        this.authorID = aID;
        this.oldDescription = oldDescription;
        this.type = type;
        this.caseNum = caseNum;
    }
}

async function setDescription(groupID, newDescription) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/description`,
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            "Cookie": `.ROBLOSECURITY=${configFile.cookie}`
        },
        data: {
            description: newDescription
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

    let isAllowed = false;
    for(var i = 0; i < allowedRanks.length; i++) {
        if(message.member.roles.cache.some(role => [allowedRanks[i]].includes(role.name))) {
            isAllowed = true;
        }
    }

    if(isAllowed == false) {
        return message.channel.send(embedMaker('No permission', "You don't have permission to use this command!"));
    }

    let description = args.splice(0).join(" ");
    if(!description) {
        return message.channel.send(embedMaker("No Description Supplied", `You didn't supply a description for me to set the group's description to`));
    }

    let oldDescription = (await roblox.getGroup(configFile.groupID)).description;

    try {
        await setDescription(configFile.groupID, description);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to set the description of the group: ${err.response.data[0].userFacingMessage}`));
    }

    message.channel.send(embedMaker("Success", `You have successfully set the group's description to **${description}**`));
    setDescriptionCoolDown.add(message.author.id);

    if(configFile.loggingEnabled == true) {
        let channel = client.channels.cache.get(configFile.logChannelID);

        if(!channel) {
            return message.channel.send(embedMaker('No Channel', "Logging is enabled, but the selected channel can't be accessed by the bot"));
        }

        let logDatabase = await db.get("logs") || [];
        let caseNumDatabase = await db.get("caseNum") || 1;
        let newLogObject = new Log(message.author.id, oldDescription, "SetDescription", caseNumDatabase);

        logDatabase.push(newLogObject);
        caseNumDatabase++;
        await db.set("caseNum", caseNumDatabase);
        await db.set("logs", logDatabase);

        let embed = embedMaker('Log Detected', "Someone has just done a group action with the bot. This log information is below");
        embed.addField("Log Information", `**Command Author**: <@${message.author.id}> (${message.author.id})\n**Old Description**: ${newLogObject.oldDescription}\n**New Description**: ${description}\n**Case Number**: ${newLogObject.caseNum}`);
        channel.send(embed);
        message.channel.send(embedMaker('Logged', "Due to the bot's settings in the configuration file, this action has been logged"));
    } else {
        message.channel.send(embedMaker('Not Logged', "Due to the bot's settings in the configuration file, this action wasn't logged"));
    }

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        setDescriptionCoolDown.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**setdescription <new description>**";
    let description = "Sets the group's description to <new description>";
    return `${name} - ${description}\n`;
}