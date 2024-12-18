const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const db = require("../../db.js");
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

    let verifiedUsers = await db.get("verifiedUsers") || [];
    let member = message.guild.member(message.mentions.members.first()) || await message.guild.members.fetch(args[0]);
    if(!member) {
        return message.channel.send(embedMaker("Invalid User", "The Discord user that you supplied is either not in the server or doesn't exist"));
    }
    let memberID = member.id;
    let index = -1;

    for(var i = 0; i < verifiedUsers.length; i++) {
        if(memberID === verifiedUsers[i].discordID) {
            index = i;
            break;
        }
    }

    if(index == -1) {
        return message.channel.send(embedMaker("Error", "This user isn't verified with this bot"));
    }

    let object = verifiedUsers[index];
    let embed = embedMaker('Success', "I have successfully retrived the data related to this user");
    embed.addField("User Information", `**Discord ID**: ${object.discordID}\n**Roblox ID**: ${object.robloxID}`);
    embed.addField("Group Information", `**Rank Name in Group**: ${await roblox.getRankNameInGroup(configFile.groupID, object.robloxID)}\n**Rank ID in Group**: ${await roblox.getRankInGroup(configFile.groupID, object.robloxID)}`);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**whois <discord mention|id>**";
    let description = "Gets information on the verified Roblox account of the mentioned Discord account";
    return `${name} - ${description}\n`;
}