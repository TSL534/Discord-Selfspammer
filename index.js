let version = "1.1.0";
const { Client, WebhookClient } = require("discord.js-selfbot-v13");
const fs = require("fs-extra");
const chalk = require("chalk");

const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");
let log;
if (config?.logWebhook?.length > 25) {
  log = new WebhookClient({ url: config.logWebhook });
}

// Getting & separating the tokens
let data = process.env.TOKENS || fs.readFileSync("./tokens.txt", "utf-8");
if (!data) throw new Error(`Unable to find your tokens.`);
const tokens = data.split(/\s+/).filter(token => token); 
config.tokens = tokens; 

const serverId = process.env.SERVER_ID || config.serverId;

// Replit .env check
if (process.env.REPLIT_DB_URL && (!process.env.TOKENS || !process.env.CONFIG))
  console.log(
    `You are running on replit, please use its secret feature to prevent your tokens and webhook from being stolen and misused.\nCreate a secret variable called "CONFIG" for your config, and a secret variable called "TOKENS" for your tokens.`
  );

// Main function which handles the actual spamming
async function Login(token) {
  if (!token) {
    console.log(
      chalk.redBright("You must specify a (valid) token.") +
      chalk.white(` ${token} is invalid.`)
    );
    return;
  }

  // Initiating the djs-selfbot client and logging in
  const client = new Client({ checkUpdate: false, readyStatus: false });
  client.login(token).catch(() => {
    console.log(
      `Failed to login with token "${chalk.red(token)}"! Please check if the token is valid.`
    );
  });

  // Ready event which starts the spammer
  client.on("ready", async () => {
    console.log(`Logged in to ` + chalk.red(client.user.tag) + `!`);
    client.user.setStatus("invisible"); // you can change this if you want 

    let channels;

    if (config.onlyChannels) {
      // Fetch specific channels by IDs
      channels = await Promise.all(
        config.channelIds.map(async (channelId) => {
          try {
            const channel = await client.channels.fetch(channelId);
            return channel;
          } catch (err) {
            console.log(chalk.yellow(`Couldn't access channel ${channelId}, skipping.`));
            return null;
          }
        })
      );
      channels = channels.filter(channel => channel); // Filter out null values
    } else {
      // Fetch all channels from a specific server
      if (!serverId) throw new Error(`You must specify a server ID to target.`);
      const guild = await client.guilds.fetch(serverId);
      if (!guild) {
        throw new Error(
          `Couldn't find the guild specified for ${client.user.username}. Please check if the Account has access to it`
        );
      }

      channels = guild.channels.cache.filter(channel =>
        channel.isText()
      );

      if (channels.size === 0) {
        throw new Error(
          `Couldn't find any text channels in the server ${guild.name}.`
        );
      }
    }

    const messages = fs
      .readFileSync("./data/messages.txt", "utf-8")
      .split("\n");

    setInterval(() => {
      const message = messages[Math.floor(Math.random() * messages.length)];
      channels.forEach(channel => {
        channel.send(message).catch(err => {
          if (err.code === 50001 || err.code === 50013) { 
            console.log(
              chalk.yellow(`Skipping channel ${channel.id} / No perms or accres.`)
            );
          } else {
            console.log(`Error on channel ${channel.id}:`, err);
          }
        });
      });
    }, config.spamSpeed);
  });
}

async function start() {
  for (var i = 0; i < config.tokens.length; i++) {
    await Login(config.tokens[i]);
  }
}

// Error handling
process.on("unhandledRejection", (reason, p) => {
  if (config.debug) {
    console.log(" [Anti Crash] >>  Unhandled Rejection/Catch");
    console.log(reason, p);
  }
});
process.on("uncaughtException", (e, o) => {
  if (config.debug) {
    console.log(" [Anti Crash] >>  Uncaught Exception/Catch");
    console.log(e, o);
  }
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  if (config.debug) {
    console.log(" [AntiCrash] >>  Uncaught Exception/Catch (MONITOR)");
    console.log(err, origin);
  }
});
process.on("multipleResolves", (type, promise, reason) => {
  if (config.debug) {
    console.log(" [AntiCrash] >>  Multiple Resolves");
    console.log(type, promise, reason);
  }
});


start();
