const Discord = require('discord.js');
const roblox = require('noblox.js');
const db = require("../../db.js");
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

    let caseNum = Number(args[0]);
    if(!caseNum) {
        return message.channel.send(embedMaker("No Case Number Supplied", `You didn't supply a case number for me get the information of`));
    }

    let logDatabase = await db.get("logs") || [];
    let index = -1;

    for(var i = 0; i < logDatabase.length; i++) {
        if(logDatabase[i].caseNum == caseNum) {
            index = i;
        }
    }

    if(index == -1) {
        return message.channel.send(embedMaker("Invalid Case ID", `The case ID that you supplied isn't a valid case ID`));
    }

    let embed = embedMaker("Success", `I have successfully grabbed the case information for the case ID that you supplied`);

    let object = logDatabase[index];

    if(object.type === "AcceptAllyRequest") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**Accepted Group ID**: [Click Me](https://roblox.com/groups${object.acceptedGroupID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "CreateAllyRequest") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**Requested Group ID**: [Click Me](https://roblox.com/groups${object.requestedGroupID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "DeleteAlly") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**Deleted Group ID**: [Click Me](https://roblox.com/groups${object.deletedGroupID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "DenyAllyRequest") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**Denined Group ID**: [Click Me](https://roblox.com/groups${object.deninedGroupID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "SetDescription") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Old Description**: ${object.oldDescription}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "SetLogo") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "AcceptJoinRequest" || object.type === "DenyJoinRequest" || object.type === "Exile") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**User's Username**: ${await roblox.getUsernameFromId(object.userID)} (${object.userID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "Payout") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**User's Username**: ${await roblox.getUsernameFromId(object.userID)} (${object.userID})\n**Amount of Robux**: ${object.amountOfRobux}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "PurgeWall") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**User's Username**: ${await roblox.getUsernameFromId(object.userID)} (${object.userID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "Promote" || object.type === "Demote") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**User's Username**: ${await roblox.getUsernameFromId(object.userID)} (${object.userID})\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "SetRank" || object.type === "Fire") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**User's Username**: ${await roblox.getUsernameFromId(object.userID)} (${object.userID})\n**Old Rank ID**: ${object.oldRankID}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "Shout") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Roblox Username**: ${await roblox.getUsernameFromId(object.authorRBXID)} (${object.authorRBXID})\n**Old Shout**: ${object.oldShout}`);
        return message.channel.send(embed);
    }

    if(object.type === "CreateSocialLink") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Type of Social Link**: ${object.typeOfSocialLink}\n**Title of Social Link**: ${object.title}\n**URL of Social Link**: ${object.url}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "DeleteSocialLink") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Deleted Social Link ID**: ${object.socialLinkID}\n**Social Link Type**: ${object.socialLinkType}\n**Social Link URL**: ${object.socialLinkURL}\n**Social Link Title**: ${object.socialLinkTitle}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }

    if(object.type === "UpdateSocialLink") {
        embed.addField("Log Information", `**Command Author**: <@${object.authorID}> (${object.authorID})\n**Updated Social Link ID**: ${object.socialLinkID}\n**Updated Property of Social Link**: ${object.typeOfUpdate}\n**Replacement Text**: ${object.newText}\n**Type**: ${object.type}`);
        return message.channel.send(embed);
    }
}

exports.help = async() => {
    let name = "**case <case num>**";
    let description = "Gets case information from <case num>";
    return `${name} - ${description}\n`;
}
