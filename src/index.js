require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const pdfkit = require("pdfkit");
const fs = require("fs");
const doc = new pdfkit();

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
    entryDate: Date,
    submissionFormat: String,
    streak: Number,
    eligibility: Boolean,
  });

  const User = mongoose.model("User", userSchema);

  client.on("messageCreate", async (message) => {
    if (message.author.bot) {
      return;
    }

    if (message.content.startsWith("!post")) {
      const userLink = message.content.slice("!post".length).trim();

      if (isValidLink(userLink)) {
        const userId = message.author.id;
        const entryDate = new Date();
        const submissionFormat = getSubmissionFormat(userLink);
        let streak = 1;
        let eligibility = true;

        // Check the user's previous entry date to calculate streak
        const lastEntry = await User.findOne({ userId }).sort({
          entryDate: -1,
        });

        if (lastEntry) {
          const today = new Date();
          const lastEntryDate = new Date(lastEntry.entryDate);

          // Check if the user is posting daily
          if (isDaily(lastEntryDate, today)) {
            streak = lastEntry.streak + 1;
          } else {
            streak = 1;
            eligibility = false; // Reset eligibility if they missed a day
          }
        }

        const newUser = new User({
          userId,
          entryDate,
          submissionFormat,
          streak,
          eligibility,
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

    if (message.content === "!export-eligible") {
      // Implement logic to fetch eligible participants from the database
      const eligibleParticipants = await User.find({ eligibility: true });

      // Create a PDF with the list of eligible participants

      doc.pipe(fs.createWriteStream("eligible_participants.pdf"));
      doc
        .fontSize(18)
        .text("Eligible Participants", { align: "center" })
        .fontSize(14);

      eligibleParticipants.forEach((participant) => {
        doc.text(`User ID: ${participant.userId}`);
        doc.text(`Submission Format: ${participant.submissionFormat}`);
        doc.text(`Streak: ${participant.streak}`);
        doc.text("-----------------------------");
      });

      doc.end();

      // Send the PDF to the user
      message.author.send({
        files: ["eligible_participants.pdf"],
      });
    }
  });
});

// Helper functions

function isValidLink(link) {
  // Implement logic to validate the format of the user's post link
  // Example: Check if the link contains "https://twitter.com/" for Twitter posts
  return (
    link.startsWith("https://twitter.com/") ||
    link.startsWith("https://www.twitter.com/") ||
    link.startsWith("https://www.linkedin.com/")
  );
  // You can add more conditions to match other valid formats
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
