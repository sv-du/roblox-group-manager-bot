const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));

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


    let info = await roblox.getGroup(configFile.groupID);

    let embed = embedMaker("Success", `I have successfully grabbed the group's information from the API`);
    embed.addField("Group Information", `**\nBasic Group Information**\n**Name**: ${info.name}\n**ID**: ${info.id}\n**Description**: ${info.description}\n**Member Count**: ${info.memberCount}\n**Current Shout**: ${info.shout.body}\n\n**Owner Information**\n**Name**: ${info.owner.username}\n**ID**: ${info.owner.userId}\n**Membership Type**: ${info.owner.buildersClubMembershipType}\n\n**Group Permissions**\n**isBuildersClubOnly**: ${info.isBuildersClubOnly}\n**isLocked**: ${info.isLocked || false}\n**publicEntryAllowed**: ${info.publicEntryAllowed}`);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**info**";
    let description = "Gets the group information";
    return `${name} - ${description}\n`;
}