const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

class User {
    userID;
    rankID;

    constructor(uID, rID) {
        this.userID = uID;
        this.rankID = rID;
    }
}

async function getServer() {
    let axios = require('axios').default;

    let request = await axios({
        method: "GET",
        url: "https://apiv2.gofile.io/getServer"
    });

    return request.data.data.server;
}

async function uploadFile(file) {
    let axios = require('axios').default;
    let FormData = require('form-data');

    let data = new FormData();
    data.append("file", file);

    let request = await axios({
        method: "POST",
        url: `https://${await getServer()}.gofile.io/uploadFile`,
        headers: data.getHeaders(),
        data: data
    });

    return request.data;
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

    message.channel.send(embedMaker("Awaiting", `Please wait for me to gather all the users and their role's in the group, this could take a few minutes for a huge group`))

    let ranks = await roblox.getRoles(configFile.groupID);

    let memberData = [];

    for(let i = 0; i < ranks.length; i++) {
        let rankID = ranks[i].rank;
        let members = [];

        if(configFile.maxAmountOfMembersToCollect == false) {
            members = await roblox.getPlayers(configFile.groupID, ranks[i].ID, "Asc", ranks[i].memberCount);
        } else {
            if(ranks[i].memberCount > configFile.maxAmountOfMembersToCollect) {
                message.channel.send(embedMaker("Max Amount of Members Reached", `The max amount of members set in the configuration file (${configFile.maxAmountOfMembersToCollect}) has been reached, skipping role...`));
            } else {
                members = await roblox.getPlayers(configFile.groupID, ranks[i].ID, "Asc", configFile.maxAmountOfMembersToCollect);
            }
        }

        for(let i = 0; i < members.length; i++) {
            memberData.push(new User(members[i].userId, rankID));
        }

    }

    let groupSaveData = {
        "requester": message.author.id,
        "users": memberData
    }

    await fs.writeFile('groupSaveData.json', JSON.stringify(groupSaveData));

    message.channel.send(`<@${message.author.id}>`);
    message.channel.send(embedMaker("Success", `I have sucessfully saved the group members' ranks, attempting to DM you the file...`));

    let didError = false;

    try {
        await message.author.send({
            files: [{
                attachment: "groupSaveData.json"
            }]
        });
    } catch {
        message.channel.send(embedMaker("Error", `There was an error while attempting to send the file in file form, please wait while I attempt to send the file in link form...`));
        didError = true;
    }

    if(didError == true) {

        let r = await uploadFile(fs.createReadStream('groupSaveData.json'));
    
        try {
            await message.author.send(`https://gofile.io/d/${r.data.code}`);
        } catch {
            message.channel.send(embedMaker("Error", `There was an error while attempting to send the file in link form, please make sure you have your DMS enabled to get the data`));
        }

    }

    await fs.unlinkSync('groupSaveData.json');
}

exports.help = async() => {
    let name = "**saveranks**";
    let description = "Saves all the ranks' members in the group to revert later";
    return `${name} - ${description}\n`;
}