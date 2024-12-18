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

    let requests
    try {
        requests = await roblox.getJoinRequests(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while trying to get join requests: ${err}`));
    }

    if(requests.data.length == 0) {
        return message.channel.send(embedMaker("Error", "There are no requests in the group"));
    }

    let embed = embedMaker("Success", `There are ${requests.data.length} join request(s) in the group`);
    let fData = "";

    for(var i = 0; i < requests.data.length; i++) {
        fData += `**Username**: ${requests.data[i].requester.username}\n**User ID**: ${requests.data[i].requester.userId}\n`;
    }

    embed.addField("Requests", fData);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getjoinrequests**";
    let description = "This command gets the join requests in the group";
    return `${name} - ${description}\n`;
}