const Discord = require('discord.js');
const ms = require('ms');
const fs = require('then-fs');
const configFile = JSON.parse(fs.readFileSync('./config.json'));

async function readCommandDir(dirName) {
    let cmds = [];
    let files = await fs.readdir(`./commands/${dirName}`);

    for(var i = 0; i < files.length; i++) {
        let file = files[i];
        if(!file.endsWith(".js")) throw new Error(`Invalid file detected in commands folder, please remove this file for the bot to work: ${file}`);
        let coreFile = require(`../../commands/${dirName}/${file}`);
        cmds.push({
            file: coreFile
        });
    }

    return cmds;
}

async function generateHelpEmbed(embedMakerFunction, title, arrayToRead) {
    let embed = embedMakerFunction(title, "");
    let embedD = `There are ${arrayToRead.length} command(s) in this category\n\n**Commands**\n`;

    for(var i = 0; i < arrayToRead.length; i++) {
        embedD += await arrayToRead[i].file.help();
    }

    embed.setDescription(embedD);

    embed.addField("Emojis", `1 - Ally Commands\n2 - General Commands\n3 - Group Commands\n4 - Member Commands\n5 - Ranking Commands\n6 - Group Settings Commands\n7 - Shouting Commands\n8 - Social Link Commands\n9 - Verification Commands\n10 - Rank Revert Commands`);

    return embed;
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
    
    let allyCommands = await readCommandDir("allies");
    let generalCommands = await readCommandDir("general");
    let groupCommands = await readCommandDir("group");
    let memberCommands = await readCommandDir("members");
    let rankingCommands = await readCommandDir("ranks");
    let settingsCommands = await readCommandDir("settings");
    let shoutingCommands = await readCommandDir("shouting");
    let socialLinkCommands = await readCommandDir("sociallinks");
    let verificationCommands = await readCommandDir("verification");
    let rankRevertingCommands = await readCommandDir("rankreverting");

    let allyCommandsEmbed = await generateHelpEmbed(embedMaker, "Ally Commands", allyCommands);
    let generalCommandsEmbed = await generateHelpEmbed(embedMaker, "General Commands", generalCommands);
    let groupCommandsEmbed = await generateHelpEmbed(embedMaker, "Group Commands", groupCommands);
    let memberCommandsEmbed = await generateHelpEmbed(embedMaker, "Member Commands", memberCommands);
    let rankingCommandsEmbed = await generateHelpEmbed(embedMaker, "Ranking Commands", rankingCommands);
    let settingsCommandsEmbed = await generateHelpEmbed(embedMaker, "Settings Commands", settingsCommands);
    let shoutingCommandsEmbed = await generateHelpEmbed(embedMaker, "Shouting Commands", shoutingCommands);
    let socialLinkCommandsEmbed = await generateHelpEmbed(embedMaker, "Social Link Commands", socialLinkCommands);
    let verificationCommandsEmbed = await generateHelpEmbed(embedMaker, "Verification Commands", verificationCommands);
    let rankRevertingCommandsEmbed = await generateHelpEmbed(embedMaker, "Rank Reverting Commands", rankRevertingCommands);

    let channel = await message.author.createDM();

    let msg
    try {
        msg = await channel.send(allyCommandsEmbed);
    } catch (err) {
        return message.channel.send(embedMaker("Error", `There was an error while atttempting to DM you: ${err}`));
    }

    message.channel.send(embedMaker("Success", `I have successfully sent the help embed to your DMs`));

    await msg.react('1️⃣');
    await msg.react('2️⃣');
    await msg.react('3️⃣');
    await msg.react('4️⃣');
    await msg.react('5️⃣');
    await msg.react('6️⃣');
    await msg.react('7️⃣');
    await msg.react('8️⃣');
    await msg.react('9️⃣');
    await msg.react('🔟');

    let filter = (reaction, user) => reaction.emoji.name == "1️⃣" || reaction.emoji.name == "2️⃣" || reaction.emoji.name == "3️⃣" || reaction.emoji.name == "4️⃣" || reaction.emoji.name == "5️⃣" || reaction.emoji.name == "6️⃣" || reaction.emoji.name == "7️⃣" || reaction.emoji.name == "8️⃣" || reaction.emoji.name == "9️⃣" || reaction.emoji.name == "🔟";
    let collector = msg.createReactionCollector(filter, {time: ms("2m")});

    collector.on("collect", async (reaction, user) => {
        if(reaction.emoji.name == "1️⃣") {
            await msg.edit(allyCommandsEmbed);
        } else if(reaction.emoji.name == "2️⃣") {
            await msg.edit(generalCommandsEmbed);
        } else if(reaction.emoji.name == "3️⃣") {
            await msg.edit(groupCommandsEmbed);
        } else if(reaction.emoji.name == "4️⃣") {
            await msg.edit(memberCommandsEmbed);
        } else if(reaction.emoji.name == "5️⃣") {
            await msg.edit(rankingCommandsEmbed);
        } else if(reaction.emoji.name == "6️⃣") {
            await msg.edit(settingsCommandsEmbed);
        } else if(reaction.emoji.name == "7️⃣") {
            await msg.edit(shoutingCommandsEmbed);
        } else if(reaction.emoji.name == "8️⃣") {
            await msg.edit(socialLinkCommandsEmbed);
        } else if(reaction.emoji.name == "9️⃣") {
            await msg.edit(verificationCommandsEmbed);
        } else if(reaction.emoji.name == "🔟") {
            await msg.edit(rankRevertingCommandsEmbed);
        }
    });

    collector.on("end", async () => {
        return channel.send(embedMaker("Timed Out", `The help system has timed out! If you want more time, please rerun the help command`));
    });
}

exports.help = async() => {
    let name = "**help**";
    let description = "Sends the help menu in DMs";
    return `${name} - ${description}\n`;
}