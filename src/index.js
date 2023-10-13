require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("messageCreate", (message) => {
  if (message.author.bot) {
    return;
  }
  if (message.content === "hello") {
    message.reply("Hey! how may i help you?");
  }
});
client.on("messageCreate", (message) => {
  if (message.content === "cuss") {
    message.reply("Char chawanni ghode pe Faizan mere lode pe!");
  }
});

client.on("ready", (c) => {
  console.log(`✅${c.user.tag} is online.`);
});
client.login(process.env.TOKEN);
