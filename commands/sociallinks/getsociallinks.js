const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

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
        r = await getSocialLinks(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to get the group's social links: ${err.response.data[0].userFacingMessage}`));
    }

    let socialLinks = r.data.data;

    if(socialLinks.length == 0) {
        return message.channel.send(embedMaker("Social Links", `There are no social links in this group`));
    }

    let embedD = "";

    for(var i = 0; i < socialLinks.length; i++) {
        embedD += `**Title**: ${socialLinks[i].title} | **ID**: ${socialLinks[i].id} | **Type**: ${socialLinks[i].type} | **URL**: [Click Me](${socialLinks[i].url})\n`;
    }

    let embed = embedMaker("Social Links", `There are ${socialLinks.length} social link(s) in the group`);
    embed.addField("Social Links", embedD);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getsociallinks**";
    let description = "Gets the linked group's social links";
    return `${name}  - ${description}\n`;
}