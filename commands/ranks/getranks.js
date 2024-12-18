const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

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

    let roles = await roblox.getRoles(configFile.groupID);

    let embed = embedMaker("Success", `I have successfully grabbed the role information for ${roles.length} roles`);
    
    if(roles.length == 0) {
        embed.addField("Role Information", `There are no roles in the group that I was able to collect`);
        return message.channel.send(embed);
    }

    let str = "";

    for(var i = 0; i < roles.length; i++) {
        str += `**Rank Name**: ${roles[i].name} | **Rank ID**: ${roles[i].rank} | **MemberCount**: ${roles[i].memberCount}\n`;
    }

    embed.addField("Role Information", str);

    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getranks**";
    let description = "Gets rank information of all the ranks in the linked Roblox group";
    return `${name} - ${description}\n`;
}