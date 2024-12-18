const Discord = require('discord.js');
const roblox = require('noblox.js');
const fs = require('then-fs');
const ms = require('ms');
const db = require('./db.js');
const configFile = JSON.parse(fs.readFileSync('./config.json'));
const client = new Discord.Client();
const token = configFile.token;
const cookie = configFile.cookie;
const prefix = configFile.prefix;

const commandList = [];

async function readCommandDir(dirName) {
    let files = await fs.readdir(`./commands/${dirName}`);

    for(var i = 0; i < files.length; i++) {
        let file = files[i];
        if(!file.endsWith(".js")) throw new Error(`Invalid file detected in commands folder, please remove this file for the bot to work: ${file}`);
        let coreFile = require(`./commands/${dirName}/${file}`);
        commandList.push({
            file: coreFile,
            name: file.split('.')[0]
        });
    }
}

async function login(cookie) {
    try {
        await roblox.setCookie(cookie);
    } catch (err) {
        throw new Error(err);
    }

    if(configFile.onGroupActionLogging == true) {
        let onAuditLog = roblox.onAuditLog(configFile.groupID);
        onAuditLog.on("data", async log => {
            let botUsername = (await roblox.getCurrentUser()).UserName;
            if(log.actor.user.username === botUsername) return;
            if(log.actionType == "Post Status") return;
            let channel = client.channels.cache.get(configFile.groupActionChannelID);
            if(channel) {
                let embed = new Discord.MessageEmbed();
                embed.setColor(configFile.embedColor);
                embed.setAuthor(client.user.tag, client.user.displayAvatarURL());
                embed.setTitle("New Audit Log");
                embed.setDescription("Someone just executed an action on the group, the log information is below");
                embed.addField("Log Information", `**Author's Username**: ${log.actor.user.username}\n**Author's ID**: ${log.actor.user.userId}\n**Author's Rank**: ${log.actor.role.name}\n**Type**: ${log.actionType}\n**Creation Date**: ${log.created}`);
                embed.setFooter('System created by zachariapopcorn#8105 - https://discord.gg/XGGpf3q');
                channel.send(embed);
            }
        });
        onAuditLog.on("error", async err => {
            console.log(`There was an error in the onAuditLog() function: ${err}`);
        });
    }
    
    if(configFile.onGroupShoutLogging == true) {
        let onShout = roblox.onShout(configFile.groupID);
        onShout.on("data", async newShout => {
            let botUsername = (await roblox.getCurrentUser()).UserName;
            if(newShout.poster ? newShout.poster.username : newShout.author.name === botUsername) return;
            let channel = client.channels.cache.get(configFile.groupShoutChannelID);
            if(channel) {
                let embed = new Discord.MessageEmbed();
                embed.setColor(configFile.embedColor);
                embed.setAuthor(client.user.tag, client.user.displayAvatarURL());
                embed.setTitle("New Shout");
                embed.setDescription("Someone just shouted in the group, the shout information in below");
                embed.addField("Shout Information", `**Username**: ${newShout.poster.username}\n**User ID**: ${newShout.poster.userId}\n**Shout Body**: ${newShout.body}`);
                embed.setFooter('System created by zachariapopcorn#8105 - https://discord.gg/XGGpf3q');
                channel.send(embed);
            }
        });
        onShout.on("error", async err => {
            console.log(`There was an error in the onShout() function: ${err}`);
        });
    }

    console.log(`Logged into the Roblox account - ${((await roblox.getCurrentUser()).UserName)}`);
    return true;
}


async function check() {

    function embedMaker(title, description) {
        let embed = new Discord.MessageEmbed();
        embed.setColor(configFile.embedColor);
        embed.setAuthor(client.user.tag, client.user.displayAvatarURL());
        embed.setTitle(title);
        embed.setDescription(description);
        embed.setFooter('System created by zachariapopcorn#8105 - https://discord.gg/XGGpf3q');
        return embed;
    }

    if(configFile.groupMemberCountingEnabled != true) return;

    let channel = client.channels.cache.get(configFile.countingLogChannel);
    if(!channel) return;

    let goal = configFile.goal;
    if(isNaN(goal)) return;

    let currentLogged = await db.get("currentLogged") || 0;

    let groupID = configFile.groupID;

    let memberCount = (await roblox.getGroup(groupID)).memberCount;

    if(memberCount == currentLogged) return;

    if(memberCount >= goal) {
        let e = embedMaker('Goal Reached', `We have reached our goal of ${goal} group member(s)! We are now ${memberCount - goal} group members above our current goal`);
        e.addField('Information', `**Old Membercount**: ${currentLogged}\n**New Membercount**: ${memberCount}\n**Goal Reached?**: Yes`);
        await db.set("currentLogged", memberCount);
        return channel.send(e);
    } else {
        if(memberCount > currentLogged) {
            let e = embedMaker('Addition', `We have grown by ${memberCount - currentLogged} group member(s)! Now we are ${goal - memberCount} group members away from our goal of ${goal} group members`);
            e.addField('Information', `**Old Membercount**: ${currentLogged}\n**New Membercount**: ${memberCount}\n**Goal Reached?**: No`);
            await db.set("currentLogged", memberCount);
            return channel.send(e);
        } else {
            let e = embedMaker('Subtraction', `We have lost ${currentLogged - memberCount} group member(s)! Now we are ${goal - memberCount} group members away from our goal of ${goal} group members`);
            e.addField('Information', `**Old Membercount**: ${currentLogged}\n**New Membercount**: ${memberCount}\n**Goal Reached?**: No`);
            await db.set("currentLogged", memberCount);
            return channel.send(e);
        }
    }
}

let time = `${configFile.intervalOfCounting}s`;

setInterval(async () => {
    await check();
}, ms(time));


client.on('ready', async() => {
    console.log(`Logged into the Discord account - ${client.user.tag}`);
    await login(cookie);

    await readCommandDir("allies");
    await readCommandDir("general");
    await readCommandDir("group");
    await readCommandDir("members");
    await readCommandDir("ranks");
    await readCommandDir("settings");
    await readCommandDir("shouting");
    await readCommandDir("sociallinks");
    await readCommandDir("verification");
    await readCommandDir("rankreverting");
});



client.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type == "dm") return;
    if(!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).split(" ");
    let command = args.shift().toLowerCase();
    let index = commandList.findIndex(cmd => cmd.name === command);
    if (index == -1) return;
    commandList[index].file.run(message, client, args);
});

client.login(token);