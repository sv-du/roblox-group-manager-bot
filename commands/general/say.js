const Discord = require('discord.js');
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const sayCoolDowns = new Set();

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

    if(sayCoolDowns.has(message.author.id)) {
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

    let msg = args.splice(0).join(" ");
    if(!msg) {
        return message.channel.send(embedMaker("No Message Supplied", `You didn't supply a message/phrase for me to say`));
    }

    if(message.deletable == true) {
        message.delete();
    }

    let embed = embedMaker("Success", `<@${message.author.id}> is making me say the following message`);
    embed.addField("Message", msg);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**say <message>**";
    let description = "Says <message> in the chat";
    return `${name} - ${description}\n`;
}