require("dotenv").config();
const { Client, GatewayIntentBits, MessageEmbed } = require("discord.js");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Database Setup
mongoose.connect("mongodb://127.0.0.1:27017/taskPatrolBOT", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

db.once("open", () => {
  console.log("Connected to MongoDB!");

  const userSchema = new mongoose.Schema({
    userId: String,
    username: String,
    entryDate: Date,
    submissionFormat: String,
    streak: Number,
    eligibility: Boolean,
    lastSubmissionDate: Date, // to enforce the cooldown
  });

  const User = mongoose.model("User", userSchema);

  client.on("messageCreate", async (message) => {
    if (message.author.bot) {
      return;
    }
    if (message.content === "!about") {
      const aboutEmbed = {
        color: 0x0099ff,
        title: "Task Patrol Bot - About",
        description:
          "Task Patrol Bot is designed to automate the verification process for activities or challenges that require participants to post their daily progress, such as '30 Days of Code.' It helps keep track of participants' daily contributions and identifies users who are eligible for prizes based on their consistent activity.",
        fields: [
          {
            name: "Author",
            value: "[Saalim Aqueel](https://github.com/SxxAq)",
          },
          {
            name: "GitHub",
            value:
              "[Link to GitHub Repository](https://github.com/SxxAq/Discord-bot-automation)",
          },
        ],
        footer: {
          text: "Task Patrol Bot",
        },
      };

      message.channel.send({ embeds: [aboutEmbed] });
    }
    if (message.content === "!help") {
      const helpEmbed = {
        color: 0x0099ff,
        title: "Task Patrol Bot - Commands",
        description: "List of available commands and their descriptions:",
        fields: [
          {
            name: "!post",
            value: "Submit your daily progress.",
          },
          {
            name: "!submit",
            value: "Resubmit your progress for today.",
          },
          {
            name: "!export-eligible",
            value: "Export a list of eligible participants.",
          },
          {
            name: "!help",
            value: "Display this help message.",
          },
        ],
        footer: {
          text: "Task Patrol Bot",
        },
      };

      message.channel.send({ embeds: [helpEmbed] });
    }

    if (message.content.startsWith("!submit")) {
      const userLink = message.content.slice("!submit".length).trim();

      if (isValidLink(userLink)) {
        const userId = message.author.id;
        const entryDate = new Date();
        const submissionFormat = getSubmissionFormat(userLink);
        let streak = 1;
        let eligibility = true;

        // Extract the username from the message content
        const user = await client.users.fetch(userId);
        const username = user.username;

        // Check if the user has submitted progress today
        let lastEntry = await User.findOne({ userId }).sort({
          entryDate: -1,
        });

        if (lastEntry) {
          const today = new Date();
          const lastEntryDate = new Date(lastEntry.entryDate);

          if (isDaily(lastEntryDate, today)) {
            // User has already submitted today, reject the submission
            message.reply("You have already submitted progress today.");
            return;
          }

          // Update the last submission date
          lastEntry.lastSubmissionDate = today;
          lastEntry.save();
          streak = lastEntry.streak + 1;
        } else {
          lastEntry = new User({
            userId,
            username,
            entryDate,
            submissionFormat,
            streak,
            eligibility,
            lastSubmissionDate: entryDate,
          });
          lastEntry.save();
        }

        const newUser = new User({
          userId,
          username,
          entryDate,
          submissionFormat,
          streak,
          eligibility,
          lastSubmissionDate: entryDate,
        });

        newUser
          .save()
          .then((savedUser) => {
            console.log("User saved:", savedUser);
            message.reply("Your progress has been recorded!");
          })
          .catch((error) => {
            console.error("Error saving user:", error);
            message.reply("There was an error while recording your progress.");
          });
      } else {
        message.reply(
          "Invalid progress link format. Please check and try again."
        );
      }
    }

    if (message.content === "!export") {
      const eligibleParticipants = await User.find({ eligibility: true });

      // Define the data with proper column headers
      const data = eligibleParticipants.map((participant) => ({
        "User ID": participant.userId,
        Username: participant.username,
        "Submission Format": participant.submissionFormat,
        Streak: participant.streak,
      }));

      // Create an Excel sheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Create a workbook and add the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Eligible Participants");

      // Write the workbook to a file
      XLSX.writeFile(wb, "eligible_participants.xlsx");

      // Send the Excel file to the user
      message.author.send({
        files: ["eligible_participants.xlsx"],
      });
    }
    if (message.content === "!streak") {
      const userId = message.author.id;

      // Check the user's previous entry date to calculate streak
      const lastEntry = await User.findOne({ userId }).sort({
        entryDate: -1,
      });

      if (lastEntry) {
        const today = new Date();
        const lastEntryDate = new Date(lastEntry.entryDate);

        if (isDaily(lastEntryDate, today)) {
          message.channel.send(
            `Your current streak is ${lastEntry.streak} days.`
          );
        } else {
          message.channel.send(
            "You need to submit progress today to maintain your streak."
          );
        }
      } else {
        message.channel.send("You have not submitted any progress yet.");
      }
    }
  });
});

// Helper functions

function isValidLink(link) {
  // Adjust the logic to validate Twitter and LinkedIn links correctly
  // Check if the link contains the valid patterns for Twitter or LinkedIn
  const twitterPattern = /https:\/\/twitter.com\/[A-Za-z0-9_]+\/status\/\d+/;
  const linkedinPattern =
    /https:\/\/www.linkedin.com\/posts\/[A-Za-z0-9_-]+\/.+/;

  return twitterPattern.test(link) || linkedinPattern.test(link);
}

function getSubmissionFormat(link) {
  // Implement logic to detect the submission format (Twitter, LinkedIn, etc.)
  if (link.startsWith("https://twitter.com/")) {
    return "Twitter";
  } else if (link.startsWith("https://www.linkedin.com/")) {
    return "LinkedIn";
  } else {
    return "Unknown"; // Default to unknown format
  }
}

function isDaily(lastEntryDate, today) {
  // Implement logic to check if the user is posting daily
  // You may want to account for time zones and any specific posting time window
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return (
    today - lastEntryDate <= oneDay // Check if the difference is less than 24 hours
  );
}
client.on("ready", (c) => {
  console.log(`✅${c.user.tag} is online.`);
});

client.login(process.env.TOKEN);
