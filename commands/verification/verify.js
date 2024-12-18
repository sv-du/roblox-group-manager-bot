const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const db = require("../../db.js");
const configFile = JSON.parse(fs.readFileSync('./config.json'));

class Verification {
    discordID;
    robloxID;

    constructor(dID, rID) {
        this.discordID = dID;
        this.robloxID = rID;
    }
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

    let verifiedUsers = await db.get("verifiedUsers") || [];
    let username = args[0];
    if(!username) {
        return message.channel.send(embedMaker('No Username Supplied', "You didn't supply a username for me to verify you with"));
    }
    let rbxID
    try {
        rbxID = await roblox.getIdFromUsername(username);
    } catch {
        return message.channel.send(embedMaker('Invalid Username', "The username that you supplied isn't a valid Roblox username"));
    }

    username = await roblox.getUsernameFromId(rbxID);
    let code = message.author.id;
    message.channel.send(embedMaker("Verification", `Please enter the code **${code}** as your Roblox status. Please say 'done' when completed`));
    let filter = m => m.author.id === message.author.id;
    let msg = (await message.channel.awaitMessages(filter, {max: 1})).first().content.toLowerCase();
    if(msg !== "done") {
        return message.channel.send(embedMaker("Error", "It appears that you can't follow simple instructions, this verification request has been cancelled"));
    }
    let blurbOfUser = await roblox.getBlurb(rbxID);
    if(blurbOfUser.indexOf(code) == -1) {
        return message.channel.send(embedMaker("Error", `The code **${code}** isn't part of your Roblox status, this verification request has been cancelled`));
    }


    let typeOfSave = "new";
    let index
    for(var i = 0; i < verifiedUsers.length; i++) {
        if(message.author.id === verifiedUsers[i].discordID) {
            typeOfSave = "update";
            index = i;
            break;
        }
    }

    if(typeOfSave == "new") {
        let newVerificationRequest = new Verification(message.author.id, rbxID);
        verifiedUsers.push(newVerificationRequest);
        await db.set("verifiedUsers", verifiedUsers);
    } else if(typeOfSave == "update") {
        verifiedUsers[index].robloxID = rbxID;
        await db.set("verifiedUsers", verifiedUsers);
    }

    return message.channel.send(embedMaker("Success", `You have successfully verified your Discord account to the Roblox account **${username}**`));
}

exports.help = async() => {
    let name = "**verify <username>**";
    let description = "Verifies your Discord account to <username>, used to access most commands of the bot";
    return `${name} - ${description}\n`;
}
