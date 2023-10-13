require("dotenv").config();
const mongoose = require("mongoose");
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

mongoose.connect('mongodb://127.0.0.1:27017/taskPatrolBOT', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

db.once('open', () => {
  console.log('Connected to MongoDB!');

  // Define the user schema
  const userSchema = new mongoose.Schema({
    userId: String,
    entryDate: Date,
    submissionFormat: String,
    streak: Number,
    eligibility: Boolean,
  });

  // Create the User model
  const User = mongoose.model('User', userSchema);

  const newUser = new User({
    userId: '123456789',
    entryDate: new Date(),
    submissionFormat: 'Twitter',
    streak: 1,
    eligibility: true,
  });

  newUser
    .save()
    .then((savedUser) => {
      console.log('User saved:', savedUser);
    })
    .catch((error) => {
      console.error('Error saving user:', error);
    });
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
