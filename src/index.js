const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.login(
  "MTE2MDYwNTY3ODE0MzAyMTExOA.GYGxJJ.jNJ5aTu3ogYBOmzCYGTaQe7XjwQKS8DZkJOHs0"
);
