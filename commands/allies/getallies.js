const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

async function getAllies(groupID) {
    let axios = require('axios').default;
    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/relationships/allies?model.startRowIndex=0&model.maxRows=1000000000`,
        method: "GET",
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
        r = await getAllies(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to get the allies of the group: ${err.response.data[0].userFacingMessage}`));
    }

    let allies = r.data.relatedGroups;

    if(allies.length == 0) {
        return message.channel.send(embedMaker("Allies", "There are no allies for your group"));
    }

    let embedD = "";

    for(var i = 0; i < allies.length; i++) {
        embedD += `**Group Name**: ${allies[i].name} | **ID**: ${allies[i].id} | **MemberCount**: ${allies[i].memberCount}\n`;
    }

    let embed = embedMaker("Allies", `There are ${allies.length} allies in the group`);
    embed.addField("Allies", embedD);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getallies**";
    let description = "Gets the linked group's allies";
    return `${name}  - ${description}\n`;
}