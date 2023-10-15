```markdown
# Task Patrol Bot

Task Patrol Bot is a Discord bot designed to automate the verification process for activities or challenges that require participants to post their daily progress, such as "30 Days of Code." It helps keep track of participants' daily contributions and identifies users who are eligible for prizes based on their consistent activity.

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Commands](#commands)
- [Database Setup](#database-setup)
- [Scheduled Reminders](#scheduled-reminders)
- [Exporting Data](#exporting-data)
- [Contributing](#contributing)
- [License](#license)

## Features

- Automated daily progress tracking.
- Calculation of daily streaks for participants.
- Identification of eligible participants based on activity.
- Scheduled reminders for daily submissions.
- Exporting data to Excel and PDF formats.
- User-friendly and interactive Discord bot.

## Getting Started

### Prerequisites

Before setting up Task Patrol Bot, you'll need:

- Node.js
- MongoDB
- Discord Bot Token
- Discord Server

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SxxAq/Discord-bot-automation.git
   ```

2. Install dependencies:
   ```bash
   cd Discord-bot-automation
   npm install
   ```

3. Create a `.env` file in the project directory and add your Discord bot token:
   ```
   TOKEN=your_discord_bot_token
   ```

4. Start the bot:
   ```bash
   node src/index.js
   ```

## Commands

Task Patrol Bot supports the following commands:

- `!about`: Display information about the bot.
- `!help`: Show a list of available commands and their descriptions.
- `!submit [link]`: Submit your daily progress.
- `!resubmit [link]`: Resubmit your progress for today.
- `!streak`: Display your current streak.
- `!export`: Export a record of all participants.
- `!export-eligible-xlsx`: Export a list of eligible participants in XLSX format.
- `!export-eligible`: Export a list of eligible participants in PDF format.
- `!testreminder`: Manually trigger the daily progress reminder.

## Database Setup

Task Patrol Bot uses MongoDB for database storage. The schema includes user information, submission format, streak, eligibility, and last submission date.

## Scheduled Reminders

The bot schedules daily reminders at 6:00 PM (GMT+5:30) to remind participants to submit their daily progress.

## Exporting Data

You can export data in XLSX and PDF formats using the `!export` and `!export-eligible-xlsx` / `!export-eligible` commands, respectively.

## Contributing

Contributions to Task Patrol Bot are welcome! If you have suggestions or want to contribute to the development, feel free to create issues and pull requests.

## License

This project is open source and available under the [MIT License](LICENSE).

---


```
