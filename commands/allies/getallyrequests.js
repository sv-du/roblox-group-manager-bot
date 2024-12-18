const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const allowedRanks = configFile.allowedRanks;

async function getAllyRequests(groupID) {
    let axios = require('axios').default;
    let token = await roblox.getGeneralToken();

    let request = await axios({
        url: `https://groups.roblox.com/v1/groups/${groupID}/relationships/allies/requests?model.startRowIndex=0&model.maxRows=1000000000`,
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
        r = await getAllyRequests(configFile.groupID);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while attempting to get the ally requests of the group: ${err.response.data[0].userFacingMessage}`));
    }

    let allyRequests = r.data.relatedGroups;

    if(allyRequests.length == 0) {
        return message.channel.send(embedMaker("Ally Requests", "There are no ally requests for your group"));
    }

    let embedD = "";

    for(var i = 0; i < allyRequests.length; i++) {
        embedD += `**Group Name**: ${allyRequests[i].name} | **ID**: ${allyRequests[i].id} | **MemberCount**: ${allyRequests[i].memberCount}\n`;
    }

    let embed = embedMaker("Ally Requests", `There are ${allyRequests.length} ally request(s) in the group`);
    embed.addField("Ally Requests", embedD);
    return message.channel.send(embed);
}

exports.help = async() => {
    let name = "**getallyrequests**";
    let description = "Gets the linked group's ally requests";
    return `${name}  - ${description}\n`;
}