/*
Copyright (C) 2021  torn.space (https://torn.space)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

class Command {
    constructor(usage, permissions, invoke, visible = true) {
        this.usage = usage;
        this.permissions = permissions;
        this.invoke = invoke;
        this.visible = visible;
    }
}

// Permissions constants
const GUEST = -1;
const PLAYER = 0;
const YOUTUBER = 3;
const VIP = 5;
const MVP = 7;
const MODERATOR = 10;
const ADMIN = 20;
const OWNER = 30;
const EVERYONE = [GUEST, PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
const REGISTERED = [PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
const VIPPLUS = [VIP, MVP, ADMIN, OWNER];
const MVPPLUS = [MVP, ADMIN, OWNER];
const MODPLUS = [MODERATOR, ADMIN, OWNER];
const ADMINPLUS = [GUEST, PLAYER, ADMIN, OWNER];

const PERM_TABLE = [GUEST, PLAYER, YOUTUBER, VIP, MVP, MODERATOR, ADMIN, OWNER];
const HELP_TABLE = {};

global.cmds = {};

// GUEST COMMANDS
// All players including guests have access to these
cmds.help = new Command(`/help - Displays commands & usages`, EVERYONE, (commandExecuter, msg) => {
    for (const p in commandExecuter.permissionLevels) {
        const lvl = commandExecuter.permissionLevels[p];
        for (let x = 0; x < HELP_TABLE[lvl].length; ++x) {
            const cmd = HELP_TABLE[lvl][x];
            commandExecuter.socket.emit(`chat`, { msg: chatColor(`orange`) + cmd.usage, gc: commandExecuter.globalChat });
        }
    }
});

cmds.me = new Command(`/me <msg>`, EVERYONE, (commandExecuter, msg) => {
    if (msg.split(` `).length == 1) return;
    console.log(`[ME]: ${msg}`);
    playerChat(`~${commandExecuter.nameWithColor()} ${msg.substring(4)}`, commandExecuter.globalChat, commandExecuter.color, commandExecuter.guild);
});

cmds.myguild = new Command(`/myguild - Tells you what guild you're in`, EVERYONE, (commandExecuter, msg) => {
    if (commandExecuter.guild === ``) commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`orange`)}You aren't in a guild!` });
    else commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`orange`)}Your guild is: ${commandExecuter.guild}` });
});

cmds.guildlist = new Command(`/guildlist - Tells you a list of all guilds`, EVERYONE, (commandExecuter, msg) => {
    for (const g in guildList) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`orange`)}${g}` });
    }
});

cmds.playerstats = new Command(`/playerstats - See how many players are online`, EVERYONE, (commandExecuter, msg) => {
    let sumAsts = 0;
    for (const i in astCount) for (const j in astCount[i]) sumAsts += astCount[i][j];
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`orange`)}${guestCount} guests, ${playerCount} players, ${botCount} bots, and ${sumAsts} asteroids.` });
});

// PLAYER COMMANDS
// These commands are restricted to players that have registered their accounts
// This restriction is done for either technical reasons or anti-spam protection
cmds.password = new Command(`/password <newPassword>`, REGISTERED, (commandExecuter, msg) => {
    commandExecuter.changePass(msg.substring(10));
});

cmds.confirm = new Command(`/confirm <newPassword>`, REGISTERED, async (commandExecuter, msg) => {
    await commandExecuter.confirmPass(msg.substring(9));
}, false);

cmds.changeteam = new Command(`/changeteam`, REGISTERED, (commandExecuter, msg) => {
    if (!commandExecuter.docked) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}This command is only available when docked at a base.` }); return;
    }
    const split = msg.split(` `);
    if (split.length > 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/changeteam'` }); return;
    }
    if (split.length == 1) {
        commandExecuter.socket.emit(`chat`, { msg: `Are you sure? This costs 10% of your experience and money. You must have 10,000 exp. Type "/changeteam <color>" to continue. Make sure you aren't near any players or bases on your current team.` });
    }
    if (split.length == 2) {
        if (commandExecuter.experience <= 10000) {
            commandExecuter.socket.emit(`chat`, { msg: `You don't have enough experience!` });
            return;
        }
        if (split[1] !== `green` && split[1] !== `blue` && split[1] !== `red`) {
            commandExecuter.socket.emit(`chat`, { msg: `Invalid team to switch to!` });
            return;
        }
        if (split[1] === commandExecuter.color) {
            commandExecuter.socket.emit(`chat`, { msg: `That's your current team!` });
            return;
        }
        teamDict = { red: 0, blue: 1, green: 2 };
        const oldColor = commandExecuter.color;
        commandExecuter.color = split[1];
        const lossConstant = commandExecuter.tag === `B` ? 0.95 : 0.9; // MVPs lose less when switching teams
        commandExecuter.money *= lossConstant;
        commandExecuter.experience *= lossConstant;
        commandExecuter.sx = baseMap[commandExecuter.color][0];
        commandExecuter.sy = baseMap[commandExecuter.color][1];
        commandExecuter.changeSectors(commandExecuter.sy, commandExecuter.sx);
        commandExecuter.save();
    }
});

cmds.nameturret = new Command(`/nameturret <name>`, REGISTERED, (commandExecuter, msg) => {
    let num = 0;
    const base = bases[commandExecuter.sy][commandExecuter.sx];
    if (base != 0 && base.owner == commandExecuter.name) {
        base.name = msg.substring(12); num++;
    }
    commandExecuter.socket.emit(`chat`, { msg: `${num} turret(s) renamed.` });
});

cmds.joinguild = new Command(`/joinguild <guildName> <optionalinvite> - Join a guild`, REGISTERED, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (commandExecuter.guild !== ``) {
        commandExecuter.socket.emit(`chat`, { msg: `You are already in ${commandExecuter.guild}! Use /leaveguild to leave it.` });
        return;
    }
    if (split.length != 2 && split.length != 3) {
        commandExecuter.socket.emit(`chat`, { msg: `You must specify a guild name.` });
        return;
    }
    const guildName = split[1];
    const guildObj = guildList[guildName];
    if (typeof guildObj === `undefined`) {
        commandExecuter.socket.emit(`chat`, { msg: `${guildName} is not a real guild!` });
        return;
    }
    if (guildObj.public !== `public`) {
        if (split.length != 3) {
            commandExecuter.socket.emit(`chat`, { msg: `That guild is private- you must be invited by its owner, ${guildObj.owner}! Use /joinguild <guild> <invitenumber>!` });
            return;
        }
        if (split[2] !== guildObj.invite) {
            commandExecuter.socket.emit(`chat`, { msg: `That invite key is either incorrect, expired, or already used!` });
            return;
        }
        guildObj.invite = `${Math.floor(Math.random() * 100000)}`;
    }
    commandExecuter.guild = guildName;
    commandExecuter.socket.emit(`chat`, { msg: `Joined guild ${guildName}!` });
});

cmds.leaveguild = new Command(`/leaveguild - Leave your current guild`, REGISTERED, (commandExecuter, msg) => {
    if (commandExecuter.guild === ``) {
        commandExecuter.socket.emit(`chat`, { msg: `You are not in a guild!` });
        return;
    }
    commandExecuter.socket.emit(`chat`, { msg: `Left guild ${commandExecuter.guild}!` });
    commandExecuter.guild = ``;
});

cmds.pm = new Command(`/pm <player> <msg>`, REGISTERED, (commandExecuter, msg) => {
    commandExecuter.pm(msg);
});

cmds.r = new Command(`/r <msg>`, REGISTERED, (commandExecuter, msg) => {
    if (msg.split(` `).length == 1) return;
    commandExecuter.r(msg);
});

cmds.swap = new Command(`/swap`, REGISTERED, (commandExecuter, msg) => {
    commandExecuter.swap(msg);
});

cmds.mute = new Command(`/mute <player> - You will no longer hear the player's chat messages.`, EVERYONE, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/mute playername'` }); return;
    } // split looks like {"/mute", "name"}
    const name = split[1];
    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }
    commandExecuter.socket.emit(`mute`, { recipient: name });
    commandExecuter.socket.emit(`chat`, { msg: `Muted ${name}.` });
});

cmds.unmute = new Command(`/unmute <player> - You will begin hearing the player's chat messages again.`, EVERYONE, (commandExecuter, msg) => {
    if (msg.split(` `).length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/mute playername'` }); return;
    } // split looks like {"/unmute", "name"}
    const name = msg.split(` `)[1];
    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }
    commandExecuter.socket.emit(`unmute`, { recipient: name });
    commandExecuter.socket.emit(`chat`, { msg: `Unmuted ${name}.` });
});

const valid_email_regex = new RegExp(`^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`);

cmds.email = new Command(`/email <you@domain.tld> - Sets your email for password resets`, REGISTERED, (commandExecuter, msg) => {
    const email = msg.substring(7);
    if (!valid_email_regex.test(email)) {
        commandExecuter.socket.emit(`chat`, { msg: `Invalid Email!` });
        return;
    }

    savePlayerEmail(commandExecuter, email);
    commandExecuter.socket.emit(`chat`, { msg: `Registered Email Successfully!` });
});

cmds.createguild = new Command(`/createguild <guildname> - Creates a new guild`, VIPPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/createguild mynewguildname'` });
        return;
    }
    const playersguild = findGuildFromOwner(commandExecuter.name);
    if (playersguild !== -1) {
        commandExecuter.socket.emit(`chat`, { msg: `You already own guild +${playersguild}!` });
        return;
    }
    const guildName = split[1];
    if (!guildName.match(/^[0-9a-z]+$/)) {
        commandExecuter.socket.emit(`chat`, { msg: `Your guild name must only contain numbers and lowercase letters.` });
        return;
    }
    guildList[guildName] = { owner: commandExecuter.name, public: `private`, invite: `${Math.floor(Math.random() * 100000)}` };
    commandExecuter.socket.emit(`chat`, { msg: `Private guild ${guildName} created! Use /guildprivacy to toggle its privacy.` });
});

cmds.guildprivacy = new Command(`/guildprivacy - Toggle guild's privacy.`, VIPPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 1) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/guildprivacy'` });
        return;
    }
    const playersguild = findGuildFromOwner(commandExecuter.name);
    if (playersguild === -1) {
        commandExecuter.socket.emit(`chat`, { msg: `You don't own a guild!` });
        return;
    }
    guildList[playersguild].public = guildList[playersguild].public === `public` ? `private` : `public`;
    commandExecuter.socket.emit(`chat`, { msg: `Guild ${playersguild} is now ${guildList[playersguild].public}. Run this command again to change back.` });
});

cmds.guildinvite = new Command(`/guildinvite - Get guild invite code.`, VIPPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 1) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/guildinvite'` });
        return;
    }
    const playersguild = findGuildFromOwner(commandExecuter.name);
    if (playersguild === -1) {
        commandExecuter.socket.emit(`chat`, { msg: `You don't own a guild!` });
        return;
    }
    guildList[playersguild].invite = `${Math.floor(Math.random() * 100000)}`;
    commandExecuter.socket.emit(`chat`, { msg: `You can invite one user with invitation ${guildList[playersguild].invite}. Run this command again to invite another player.` });
});

cmds.give = new Command(`/give - Give a player money.`, MVPPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 3) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/give playername amountofmoney'` });
        return;
    }

    // parse player name
    const recipientName = split[1];
    const recipient = getPlayerFromName(recipientName);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Player '${recipientName}' not found.` });
        return;
    }
    if (!recipient.docked) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Player ${recipient.nameWithColor()} not docked.` });
        return;
    }
    if (!commandExecuter.docked) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}This command is only available when docked at a base.` });
        return;
    }

    // parse money amount
    const moneyAmount = parseInt(split[2]);
    if (isNaN(moneyAmount)) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Invalid money amount.` });
        return;
    }
    if (moneyAmount <= 0) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Invalid money amount.` });
        return;
    }
    if (moneyAmount > commandExecuter.money) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}You don't have that much money!` });
        return;
    }

    commandExecuter.money -= moneyAmount;
    recipient.money += moneyAmount;
    commandExecuter.save();
    recipient.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}You gave $${moneyAmount} to ${recipient.nameWithColor()}!` });
    recipient.socket.emit(`chat`, { msg: `${chatColor(`lime`)}You were given $${moneyAmount} from ${commandExecuter.nameWithColor()}!` });
});

cmds.basetp = new Command(`/basetp - Teleport to another base.`, MVPPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 1) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/basetp'` }); return;
    }
    if (!commandExecuter.docked) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}This command is only available when docked at a base.` });
        return;
    }
    if (commandExecuter.silver + commandExecuter.iron + commandExecuter.copper + commandExecuter.platinum > 0) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}You must sell all your ore to use this command!` });
        return;
    }

    const r2 = Math.random();
    const sx = baseMap[commandExecuter.color][Math.floor(r2 * basesPerTeam) * 2];
    const sy = baseMap[commandExecuter.color][Math.floor(r2 * basesPerTeam) * 2 + 1];
    commandExecuter.changeSectors(sy, sx);

    commandExecuter.socket.emit(`chat`, { msg: `Teleporting to a random base on your team...` });
});

cmds.summonwormhole = new Command(`/summonwormhole - summons the wormhole roughly in your direction, at a price of 1% of your money.`, MVPPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 1) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/summonWormhole'` }); return;
    }
    if (commandExecuter.docked) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}This command is not available when docked at a base.` });
        return;
    }

    wormhole.vx += ((commandExecuter.sx * sectorWidth + commandExecuter.x) - (wormhole.sx * sectorWidth + wormhole.x)) / 90;
    wormhole.vy += ((commandExecuter.sy * sectorWidth + commandExecuter.y) - (wormhole.sy * sectorWidth + wormhole.y)) / 90;

    let userMoney = commandExecuter.money;
    commandExecuter.money = Math.max(userMoney *= 0.99, userMoney - 1000000);
    commandExecuter.save();

    commandExecuter.socket.emit(`chat`, { msg: `Summoning Wormhole...` });
});

findGuildFromOwner = function (owner) {
    for (const i in guildList) {
        const guildData = guildList[i];
        if (guildData.owner === owner) return i;
    }
    return -1;
};

// MODERATION COMMANDS
// These commands are accessible to moderators in the game
cmds.broadcast = new Command(`/broadcast <msg> - Send a message to the whole server`, MODPLUS, (commandExecuter, msg) => {
    console.log(`ADMIN: BROADCAST INITIATED BY ${commandExecuter}: ${msg}`);
    chatAll(`${chatColor(`red`)}       BROADCAST: ${chatColor(`lime`)}${msg.substring(11)}`);
});

cmds.modmute = new Command(`/modmute <player> <minutesToMute> - Mutes the specified player server-wide.`, MODPLUS, (commandExecuter, msg) => {
    // Extracted so that it can be used both by commands in game and the discord bot. In netutils.js.
    const returnmsg = modmute(msg);
});

cmds.ipmute = new Command(`/ipmute <player> <minutesToMute> - Mutes the specified IP server-wide.`, MODPLUS, (commandExecuter, msg) => {
    // Extracted so that it can be used both by commands in game and the discord bot. In netutils.js.
    const returnmsg = ipmute(msg);
});

// ADMINSTRATOR COMMANDS
// These commands are accessible to adminstrators in the game
cmds.reboot = new Command(`/reboot - Schedules a restart of the shard with 120 second countdown`, ADMINPLUS, initReboot);

cmds.fastreboot = new Command(`/fastreboot - Schedules a restart of the shard, with 10 second countdown instead of 120`, ADMINPLUS, initFastReboot);

cmds.tp = new Command(`/tp <player> - Teleport to the player.`, ADMINPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/tp playername'` }); return;
    }
    const name = msg.split(` `)[1];
    const teleportee = getPlayerFromName(name);
    if (teleportee == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }

    const old_sy = commandExecuter.sy; const old_sx = commandExecuter.sx;

    commandExecuter.x = teleportee.x;
    commandExecuter.y = teleportee.y;
    commandExecuter.changeSectors(teleportee.sy, teleportee.sx);

    commandExecuter.socket.emit(`chat`, { msg: `Player found, attempting to teleport. May fail if they are docked or dead.` });
});

cmds.settag = new Command(`/settag <player> <tag> - Sets a player's tag. tag should not contain brackets.`, ADMINPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 3) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/settag playername tag'` }); return;
    }
    const name = msg.split(` `)[1];
    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }

    recipient.tag = msg.split(` `)[2];
    recipient.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`violet`)}Tag set.` });
});

cmds.deltag = new Command(`/deltag <player> <tag> - Removes a player's tag.`, ADMINPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! The message should look like '/settag playername'` }); return;
    }
    const name = msg.split(` `)[1];
    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }

    recipient.tag = ``;
    recipient.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`violet`)}Tag removed.` });
});

cmds.smite = new Command(`/smite <player> - Smites the specified player`, ADMINPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 2) return;
    const name = msg.split(` `)[1];

    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }
    recipient.die(0);
    chatAll(`${chatColor(`violet`)}${player.name}${chatColor(`yellow`)} has been Smitten!`);
});

cmds.kick = new Command(`/kick <player> - Kicks the specified player`, ADMINPLUS, (commandExecuter, msg) => {
    if (msg.split(` `).length != 2) return;
    const name = msg.split(` `)[1];

    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }
    recipient.kick();
    chatAll(`${chatColor(`violet`)}${name}${chatColor(`yellow`)} has been kicked!`);
});

cmds.saveturrets = new Command(`/saveTurrets - Runs a manual save on the server turrets`, ADMINPLUS, saveTurrets);

// DEVELOPER MODE COMMANDS
// These commands provide comprehensive testing capabilities and bypass normal game progression
cmds.devmode = new Command(`/devmode \u003cplayer\u003e - Toggle developer mode for a player (grants all items, max stats, unlimited resources)`, ADMINPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! Use: /devmode playername` });
        return;
    }

    const name = split[1];
    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }

    recipient.isDeveloper = !recipient.isDeveloper;

    if (recipient.isDeveloper) {
        // Grant all developer perks
        recipient.money = Number.MAX_SAFE_INTEGER / 2; // Half of max to avoid overflow issues
        recipient.experience = Number.MAX_SAFE_INTEGER / 2;
        recipient.rank = 25;
        recipient.ship = 25;
        recipient.lives = 999;

        // Max out all stats
        recipient.thrust2 = 10;
        recipient.radar2 = 10;
        recipient.agility2 = 10;
        recipient.capacity2 = 10;
        recipient.maxHealth2 = 10;
        recipient.energy2 = 10;

        // Unlock all weapon slots and give infinite ammo
        for (let i = 0; i < 10; i++) {
            recipient.weapons[i] = -1; // Empty slot, can be filled
            recipient.ammos[i] = 999999;
        }

        // Max resources
        recipient.iron = 999999;
        recipient.silver = 999999;
        recipient.platinum = 999999;
        recipient.copper = 999999;

        // Enable god mode by default
        recipient.godMode = true;

        recipient.save();
        recipient.emit(`chat`, {
            msg: `${chatColor(`lime`)}[DEVELOPER MODE] ENABLED! You now have:
• Unlimited money and resources
• Max rank (25) and stats
• 999 lives
• God mode (invincibility)
• All weapon slots unlocked
Use /godmode to toggle invincibility
Use /unlockall to unlock all weapons` });
        chatAll(`${chatColor(`violet`)}${recipient.nameWithColor()} ${chatColor(`lime`)}is now in DEVELOPER MODE!`);
    } else {
        recipient.godMode = false;
        recipient.emit(`chat`, { msg: `${chatColor(`red`)}[DEVELOPER MODE] DISABLED!` });
        chatAll(`${chatColor(`violet`)}${recipient.nameWithColor()} ${chatColor(`red`)}developer mode disabled.`);
    }

    recipient.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`violet`)}Developer mode ${recipient.isDeveloper ? 'ENABLED' : 'DISABLED'} for ${recipient.nameWithColor()}` });
});

cmds.godmode = new Command(`/godmode - Toggle invincibility (god mode)`, ADMINPLUS, (commandExecuter, msg) => {
    commandExecuter.godMode = !commandExecuter.godMode;
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(commandExecuter.godMode ? `lime` : `red`)}God Mode: ${commandExecuter.godMode ? 'ON' : 'OFF'}` });
    if (commandExecuter.godMode) {
        commandExecuter.health = commandExecuter.maxHealth;
    }
});

cmds.unlockall = new Command(`/unlockall - Unlock all weapons and items`, ADMINPLUS, (commandExecuter, msg) => {
    // Give access to all weapons by unlocking all slots
    for (let i = 0; i < 10; i++) {
        if (commandExecuter.weapons[i] === -2) {
            commandExecuter.weapons[i] = -1; // Unlock the slot
        }
        commandExecuter.ammos[i] = 999999; // Infinite ammo
    }

    // Give one of each weapon type in slots
    const bestWeapons = [39, 8, 13, 17, 36, 29, 22, 21, 19, 18]; // Selection of powerful weapons
    for (let i = 0; i < Math.min(bestWeapons.length, 10); i++) {
        commandExecuter.weapons[i] = bestWeapons[i];
        commandExecuter.ammos[i] = 999999;
    }

    commandExecuter.save();
    sendWeapons(commandExecuter);
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}All weapons unlocked! All weapon slots filled with powerful weapons and infinite ammo!` });
});

cmds.maxstats = new Command(`/maxstats - Max out all player stats`, ADMINPLUS, (commandExecuter, msg) => {
    commandExecuter.thrust2 = 10;
    commandExecuter.radar2 = 10;
    commandExecuter.agility2 = 10;
    commandExecuter.capacity2 = 10;
    commandExecuter.maxHealth2 = 10;
    commandExecuter.energy2 = 10;

    commandExecuter.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}All stats maxed out to level 10!` });
});

cmds.setmoney = new Command(`/setmoney \u003camount\u003e - Set your money to a specific amount`, ADMINPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! Use: /setmoney 1000000` });
        return;
    }

    const amount = parseInt(split[1]);
    if (isNaN(amount) || amount < 0) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Invalid amount!` });
        return;
    }

    commandExecuter.money = amount;
    commandExecuter.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}Money set to $${amount}!` });
});

cmds.setexp = new Command(`/setexp \u003camount\u003e - Set your experience to a specific amount`, ADMINPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! Use: /setexp 1000000` });
        return;
    }

    const amount = parseInt(split[1]);
    if (isNaN(amount) || amount < 0) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Invalid amount!` });
        return;
    }

    commandExecuter.experience = amount;
    commandExecuter.updateRank();
    commandExecuter.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}Experience set to ${amount}!` });
});

cmds.setrank = new Command(`/setrank \u003crank\u003e - Set your rank/ship level (0-25)`, ADMINPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 2) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! Use: /setrank 25` });
        return;
    }

    const rank = parseInt(split[1]);
    if (isNaN(rank) || rank < 0 || rank > 25) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Rank must be between 0 and 25!` });
        return;
    }

    commandExecuter.rank = rank;
    commandExecuter.ship = rank;
    commandExecuter.save();
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}Rank and ship set to ${rank}!` });
});

cmds.refill = new Command(`/refill - Refill all ammo and health`, ADMINPLUS, (commandExecuter, msg) => {
    commandExecuter.refillAllAmmo();
    commandExecuter.health = commandExecuter.maxHealth;
    commandExecuter.iron = 999999;
    commandExecuter.silver = 999999;
    commandExecuter.platinum = 999999;
    commandExecuter.copper = 999999;
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}Refilled: ammo, health, and resources!` });
});

cmds.giveweapon = new Command(`/giveweapon \u003cplayer\u003e \u003cweaponID\u003e - Give a specific weapon to a player`, ADMINPLUS, (commandExecuter, msg) => {
    const split = msg.split(` `);
    if (split.length != 3) {
        commandExecuter.socket.emit(`chat`, { msg: `Bad syntax! Use: /giveweapon playername 13` });
        return;
    }

    const name = split[1];
    const weaponId = parseInt(split[2]);

    const recipient = getPlayerFromName(name);
    if (recipient == -1) {
        commandExecuter.socket.emit(`chat`, { msg: `Player '${name}' not found.` });
        return;
    }

    if (isNaN(weaponId)) {
        commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`red`)}Invalid weapon ID!` });
        return;
    }

    // Find first empty slot
    let slotFound = false;
    for (let i = 0; i < 10; i++) {
        if (recipient.weapons[i] === -1 || recipient.weapons[i] === -2) {
            recipient.weapons[i] = weaponId;
            recipient.ammos[i] = 999999;
            slotFound = true;
            break;
        }
    }

    if (!slotFound) {
        // Override first slot if no empty slots
        recipient.weapons[0] = weaponId;
        recipient.ammos[0] = 999999;
    }

    recipient.save();
    sendWeapons(recipient);
    commandExecuter.socket.emit(`chat`, { msg: `${chatColor(`lime`)}Gave weapon ${weaponId} to ${recipient.nameWithColor()}!` });
    recipient.socket.emit(`chat`, { msg: `${chatColor(`lime`)}You received weapon ${weaponId}!` });
});

if (Config.getValue(`debug`, false)) {
    cmds.eval = new Command(`/eval .... - Evaluates arbitrary JS on the server`, ADMINPLUS, (commandExecuter, msg) => {
        try {
            // eslint-disable-next-line no-eval
            commandExecuter.socket.emit(`chat`, { msg: eval(msg.substring(5)) });
        } catch (e) {
            commandExecuter.socket.emit(`chat`, { msg: `An error occurred: ${e}` });
        }
    });

    cmds.max = new Command(`/max - Maxes out a player's stats for testing purposes`, ADMINPLUS, (commandExecuter, msg) => {
        commandExecuter.rank = 20;
        commandExecuter.money = Number.MAX_SAFE_INTEGER;
        commandExecuter.experience = Number.MAX_SAFE_INTEGER;

        commandExecuter.socket.emit(`chat`, { msg: `Max Mode Activated` });
    });
}

// Compute help menu
for (const x in PERM_TABLE) {
    HELP_TABLE[PERM_TABLE[x]] = []; // construct empty array
    for (const c in cmds) {
        const cmd = cmds[c];
        for (const p in cmd.permissions) {
            if (cmd.permissions[p] == PERM_TABLE[x] && cmd.visible) {
                HELP_TABLE[PERM_TABLE[x]].push(cmd);
            }
        }
    }
}
