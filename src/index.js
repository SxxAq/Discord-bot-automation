require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
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

        // Extract the username from the message content
        const usernameMatch = /@(\S+)/.exec(message.content);
        const username = usernameMatch ? usernameMatch[1] : "Unknown"; // Use "Unknown" if no username found

        // Check the user's previous entry date to calculate streak
        const lastEntry = await User.findOne({ userId }).sort({
          entryDate: -1,
        });

        if (lastEntry) {
          const today = new Date();
          const lastEntryDate = new Date(lastEntry.entryDate);

          if (isDaily(lastEntryDate, today)) {
            streak = lastEntry.streak + 1;
          } else {
            streak = 1;
            eligibility = false;
          }
        }

        const newUser = new User({
          userId,
          entryDate,
          submissionFormat,
          streak,
          eligibility,
          username, // Save the username in the database
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

    // if (message.content === "!export-eligible") {
    //   // Implement logic to fetch eligible participants from the database
    //   const eligibleParticipants = await User.find({ eligibility: true });

    //   // Create a PDF with the list of eligible participants

    //   doc.pipe(fs.createWriteStream("eligible_participants.pdf"));
    //   doc
    //     .fontSize(18)
    //     .text("Eligible Participants", { align: "center" })
    //     .fontSize(14);

    //   eligibleParticipants.forEach((participant) => {
    //     doc.text(`User ID: ${participant.userId}`);
    //     doc.text(`Submission Format: ${participant.submissionFormat}`);
    //     doc.text(`Streak: ${participant.streak}`);
    //     doc.text("-----------------------------");
    //   });

    //   doc.end();

    //   // Send the PDF to the user
    //   message.author.send({
    //     files: ["eligible_participants.pdf"],
    //   });
    // }
    if (message.content === "!export-eligible") {
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
    if (message.content === "!export-eligible") {
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
