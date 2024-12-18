const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

async function getSettings(groupID) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();
    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/settings`,
        method: "GET",
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

    let isAllowed = false;
    for(var i = 0; i < allowedRanks.length; i++) {
        if(message.member.roles.cache.some(role => [allowedRanks[i]].includes(role.name))) {
            isAllowed = true;
        }
    }

    if(isAllowed == false) {
        return message.channel.send(embedMaker('No permission', "You don't have permission to use this command!"));
    }

    let r

    try {
        r = await getSettings(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to get the group's settings: ${err.response.data[0].userFacingMessage}`));
    }

    let settings = JSON.stringify(r.data);
    let formattedData = "";
    for(var i = 0; i < settings.length; i++) {
        if(settings.charAt(i) == ",") {
            formattedData += `${settings.charAt(i)}\n`;
        } else if(settings.charAt(i) == ":") {
            formattedData += ": "
        } else {
            formattedData += settings.charAt(i);
        }
    }
    
    let embed = embedMaker("Success", `I have successfully grabbed the group's settings`);
    embed.addField("Group Settings", "```json\n" + formattedData + "```");
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getsettings**";
    let description = "Gets the group's settings";
    return `${name} - ${description}\n`;
}