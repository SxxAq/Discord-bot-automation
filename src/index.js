require("dotenv").config();
const { Client, GatewayIntentBits, MessageEmbed } = require("discord.js");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const schedule = require("node-schedule");
const PDFDocument = require("pdfkit");
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
mongoose.connect(process.env.MONGODB_URI, {
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
  //---------------------------------- BOT -------------------------------------------//
  client.on("messageCreate", async (message) => {
    if (message.author.bot) {
      return;
    }

    //-------------------------- ABOUT COMMAND---------------------------------------------//
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
    //------------------------------- HELP COMMAND ------------------------------------------//
    if (message.content === "!help") {
      const helpEmbed = {
        color: 0x0099ff,
        title: "Task Patrol Bot - Commands",
        description: "List of available commands and their descriptions:",
        fields: [
          {
            name: "!submit",
            value: "Submit your daily progress.",
          },
          {
            name: "!resubmit",
            value: "Resubmit your progress for today.",
          },
          {
            name: "!streak",
            value: "Display your current streak.",
          },
          {
            name: "!export",
            value: "Export Record of all participants.",
          },
          {
            name: "!about",
            value: "Display information about the bot.",
          },
          {
            name: "!testreminder",
            value: "Manually trigger the daily progress reminder.",
          },
          {
            name: "!export-eligible",
            value: "Export a list of eligible participants in PDF format.",
          },
          {
            name: "!export-eligible-xlsx",
            value: "Export a list of eligible participants in XLSX format.",
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

    //-------------------------------------- SUBMIT_TASK_POST_SETUP ------------------------------//
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
    //------------------------------------ RESUBMIT_TASK_FOR_TODAY [EDIT] ---------------------------//
    if (message.content.startsWith("!resubmit")) {
      const resubmissionLink = message.content.slice("!resubmit".length).trim();

      // Check if the resubmission link is in the correct format
      if (!isValidLink(resubmissionLink)) {
        message.reply(
          "Invalid resubmission link format. Please check and try again."
        );
        return;
      }

      const userId = message.author.id;
      const today = new Date();

      // Retrieve the user's previous entry for the current day (if it exists)
      const previousEntry = await User.findOne({ userId, entryDate: today });

      if (previousEntry) {
        // Update the previous entry with the new submission link
        previousEntry.submissionFormat = getSubmissionFormat(resubmissionLink);

        // Update any other fields as needed

        // Save the updated entry
        previousEntry.save();

        // Inform the user that their resubmission has been recorded
        message.reply("Your resubmission has been recorded!");
      } else {
        // If no previous entry is found, create a new entry for the user for the current day
        const user = await client.users.fetch(userId);
        const username = user.username;
        const entryDate = today;
        const submissionFormat = getSubmissionFormat(resubmissionLink);
        const streak = 1;
        const eligibility = true;

        const newUser = new User({
          userId,
          username,
          entryDate,
          submissionFormat,
          streak,
          eligibility,
          lastSubmissionDate: entryDate,
        });

        // Save the new entry
        newUser.save();

        // Inform the user that their resubmission has been recorded
        message.reply("Your resubmission has been recorded!");
      }
    }
    //-------------------------------------- SEND_REMINDERS ----------------------------------//
    async function checkDailyProgress() {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Query the database to find users who haven't submitted for today
      try {
        const users = await User.find({
          lastSubmissionDate: { $lt: today, $gte: yesterday },
        });

        // Iterate through the users and send reminders
        for (const user of users) {
          // Send a reminder message to the user
          const userId = user.userId; // User's Discord ID
          const reminderMessage = "Don't forget to submit your daily progress!";

          // Replace the following line with your desired method to send the reminder to the user
          const discordUser = await client.users.fetch(userId);
          discordUser.send(reminderMessage);
        }
      } catch (err) {
        console.error("Error querying the database:", err);
      }
    }

    // Schedule the reminder function to run at 6:00 PM (18:00) in GMT+5:30 every day
    schedule.scheduleJob(
      "0 18 * * *",
      { tz: "Asia/Kolkata" },
      checkDailyProgress
    );
    //============================Manually trigger reminder [Testing]========================
    if (
      message.content === "!testreminder" &&
      message.author.id === "923866421811879967"
    ) {
      checkDailyProgress(); // Manually trigger the reminder check
      message.channel.send("Testing reminders..."); // Send a confirmation message
    }
    //---------------------------------- EXPORT_CHALLENGE_RECORD_SHEET ------------------------//

    if (message.content === "!export") {
      const allParticipants = await User.find();

      if (allParticipants.length === 0) {
        message.reply("No participants found.");
      } else {
        // Define the data with proper column headers
        const data = allParticipants.map((participant) => ({
          "User ID": participant.userId,
          Username: participant.username,
          "Submission Format": participant.submissionFormat,
          Streak: participant.streak,
        }));

        // Generate a file name based on the current date and time
        const currentDate = new Date();
        const fileName = `all_participants_${currentDate.toISOString()}.xlsx`;

        // Create an Excel sheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Create a workbook and add the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "All Participants");

        // Write the workbook to the file with the generated name
        XLSX.writeFile(wb, fileName);

        // Send the Excel file to the user
        message.author.send({
          files: [fileName],
        });
      }
    }
    //---------------------------------- EXPORT_ELIGIBLE_XLSX -------------------------------//
    if (message.content === "!export-eligible-xlsx") {
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
    //-------------------------------------- EXPORT_ELIGIBLE_PDF -----------------------------//

    if (message.content === "!export-eligible") {
      const eligibleParticipants = await User.find({ eligibility: true });

      // Create a PDF document
      const doc = new PDFDocument();
      const stream = fs.createWriteStream("eligible_participants.pdf");

      doc.pipe(stream);

      doc.fontSize(16).text("Eligible Participants", { align: "center" });
      doc.moveDown();

      eligibleParticipants.forEach((participant) => {
        doc.text(`User ID: ${participant.userId}`);
        doc.text(`Username: ${participant.username}`);
        doc.text(`Streak: ${participant.streak}`);
        doc.moveDown();
      });

      doc.end();

      // Send the PDF file to the user
      message.author.send({
        files: ["eligible_participants.pdf"],
      });
    }

    //---------------------------------------- CHECK_STREAK ---------------------------------//
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

//------------------------------> Helper functions <-------------------------------

// Adjust the logic to validate Twitter and LinkedIn links correctly
function isValidLink(link) {
  // Check if the link contains the valid patterns for Twitter or LinkedIn
  const twitterRegex = /https:\/\/twitter.com\/[A-Za-z0-9_]+\/status\/\d+/;
  const linkedinRegex = /https:\/\/www.linkedin.com\/.*\//;

  return twitterRegex.test(link) || linkedinRegex.test(link);
}
// Implement logic to detect the submission format (Twitter, LinkedIn, etc.)
function getSubmissionFormat(link) {
  if (link.includes("linkedin.com/")) {
    return "LinkedIn";
  } else if (link.includes("twitter.com/")) {
    return "Twitter";
  } else {
    return "Unknown"; // Default to unknown format
  }
}
// Implement logic to check if the user is posting daily
function isDaily(lastEntryDate, today) {
  // You may want to account for time zones and any specific posting time window
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return (
    today - lastEntryDate <= oneDay // Check if the difference is less than 24 hours
  );
}

//-----------------------------------------BOT-------------------------//
client.on("ready", (c) => {
  console.log(`✅${c.user.tag} is online.`);
});

client.login(process.env.TOKEN);
