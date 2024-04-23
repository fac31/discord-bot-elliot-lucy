const path = require("path");
const { Client, Collection, Intents } = require("discord.js");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { google } = require("googleapis");
const addTaskInteraction = require('./events/addTask.js')
const codeReviewInteraction = require('./events/codeReview.js')
const updateTaskInteraction = require('./events/updateTask.js')
const toDoListsInteractions =  require('./events/toDoLists.js')
const addMeetingInteraction = require('./events/addMeeting.js')
const connectGoogleCalendarIntercation = require('./events/connectGoogleCalendar.js')
const askAiInteraction = require('./events/askAi.js')
const openAiChatbotInteraction = require("./events/openAiChatbot.js");

function configureEnv() {
  const envPath = path.resolve(__dirname, ".env");
  console.log("Loading environment variables from:", envPath);
  const result = dotenv.config({ path: envPath });
}
configureEnv();

const app = express();
app.use(cors());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT
);

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

app.get("/auth/google", (req, res) => {
  res.redirect(authUrl);
});

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("Connected to database"));
app.listen(3000, () => {
  console.log("Express server running on port 3000");
  console.log(
    "Authorize access to Google Calendar by visiting: http://localhost:3000/auth/google"
  );
});

app.use(express.json());

const token = process.env.TOKEN;

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

client.commands = new Collection();

// TASK MANAGEMENT

addTaskInteraction(client)
codeReviewInteraction(client)

// TASK TRACKING

updateTaskInteraction(client)
toDoListsInteractions(client)


//  GOOGLE CALENDER

addMeetingInteraction(client, oauth2Client)
connectGoogleCalendarIntercation(client)

// OPEN AI

askAiInteraction(client)
openAiChatbotInteraction(client)

//  GOOGLE CALENDER API

  app.get("/auth/google/callback", async (req, res) => {
    const code = req.query.code;

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const { data } = await calendar.calendarList.list();

      res.redirect("https://google.com");
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Error exchanging code for tokens");
    }
  });

client.login(token);

module.exports = client
