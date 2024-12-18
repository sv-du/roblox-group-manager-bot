const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

async function set(groupID, setting, newValue) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();
    let body

    if(setting == "isApprovalRequired") {
        body = {"isApprovalRequired": newValue};
    } else if(setting == "areEnemiesAllowed") {
        body = {"areEnemiesAllowed": newValue};
    } else if(setting == "areGroupFundsVisible") {
        body = {"areGroupFundsVisible": newValue};
    } else {
        body = {"areGroupGamesVisible": newValue}
    }

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/settings`,
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

    let isAllowed = false;
    for(var i = 0; i < allowedRanks.length; i++) {
        if(message.member.roles.cache.some(role => [allowedRanks[i]].includes(role.name))) {
            isAllowed = true;
        }
    }

    if(isAllowed == false) {
        return message.channel.send(embedMaker('No permission', "You don't have permission to use this command!"));
    }

    let setting = args[0];
    if(!setting) {
        return message.channel.send(embedMaker("No Setting Supplied", "You didn't supply a setting for me to change"));
    }

    if(setting !== "isApprovalRequired" && setting !== "areEnemiesAllowed" && setting !== "areGroupFundsVisible" && setting !== "areGroupGamesVisible") {
        return message.channel.send(embedMaker("Invalid Setting", "The setting that you supplied isn't a valid setting"));
    }

    let newValue = args[1];
    if(!newValue) {
        return message.channel.send(embedMaker("No Value Supplied", `You didn't supply a new value for me to set this setting to`));
    }

    if(newValue == "true") {
        newValue = true;
    } else if(newValue == "false") {
        newValue = false;
    }

    if(newValue != true && newValue != false) {
        return message.channel.send(embedMaker("Invalid Value", `The value that you supplied isn't valid`));
    }

    try {
        await set(configFile.groupID, setting, newValue);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting the change the settings of the group: ${err.response.data[0].userFacingMessage}`));
    }

    return message.channel.send(embedMaker("Success", `You have successfully changed the setting **${setting}** to **${newValue}**`));
}

exports.help = async() => {
    let name = "**modify <setting> <new value>**";
    let description = "Changes <setting> to <new value>";
    return `${name}  - ${description}\n`;
}