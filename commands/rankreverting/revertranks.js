const Discord = require('discord.js');
const roblox = require('noblox.js');
const axios = require('axios').default;
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

const revertCooldowns = new Set();

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

    if(revertCooldowns.has(message.author.id)) {
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

    if(!message.attachments.first()) {
        return message.channel.send(embedMaker("No Attachment Supplied", `You didn't supply a file for me to read data from`));
    }

    let url = message.attachments.first().url;

    let request = await axios({
        url: url,
        method: "GET",
        responseType: "stream"
    });

    request.data.pipe(await fs.createWriteStream('groupSaveData.json'));

    let dataFile = JSON.parse(fs.readFileSync('groupSaveData.json'));

    let users = dataFile.users;

    let couldntRevert = 0;

    for(let i = 0; i < users.length; i++) {
        try {
            await roblox.setRank(configFile.groupID, users[i].userID, users[i].rankID);
        } catch {
            couldntRevert++;
        }
    }

    message.channel.send(embedMaker("Success", `I have successfully reverted the group's ranks to the data that you supplied to me. I have successfully reverted ${users.length - couldntRevert} user(s), but I couldn't revert ${couldntRevert} user(s)`));
    revertCooldowns.add(message.author.id);
    await fs.unlinkSync('groupSaveData.json');

    let timeString = `${configFile.cooldown}s`;
    setTimeout(() => {
        revertCooldowns.delete(message.author.id);
    }, ms(timeString));
}

exports.help = async() => {
    let name = "**revertranks <file>**";
    let description = "Reverts group ranks based on the file supplied";
    return `${name} - ${description}\n`;
}