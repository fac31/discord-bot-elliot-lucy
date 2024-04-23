const dotenv = require("dotenv");
const path = require("node:path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

function configureEnv() {
  const envPath = path.resolve(__dirname, ".env");
  console.log("Loading environment variables from:", envPath);
  const result = dotenv.config({ path: envPath });
}
configureEnv();

const token = process.env.TOKEN;
const guildId = process.env.GUILDID;
const clientId = process.env.CLIENTID;

const commands = [
  {
    name: "add_task",
    description: "Add a new task with an optional deadline",
    options: [
      {
        type: 3, // 3 is type STRING
        name: "task",
        description: "The task description",
        required: true,
      },
      {
        type: 6, // USER
        name: "assignee",
        description: "The user to assign the task to",
        required: true,
      },
      {
        type: 3,
        name: "deadline",
        description: "The deadline for the task (optional)",
        required: false,
      },
    ],
  },
  {
    name: "add_meeting",
    description: "Add a new meeting",
    options: [
      {
        type: 3,
        name: "summary",
        description: "The meeting summary",
        required: true,
      },
      {
        type: 3,
        name: "start-time",
        description: "Start time of the meeting (example: 5pm = 17:00:00)",
        required: true,
      },
      {
        type: 3,
        name: "end-time",
        description: "End time of the meeting (example: 10pm = 22:00:00)",
        required: true,
      },
    ],
  },
  {
    name: "update_task",
    description: "Update an existing task",
    options: [
      {
        type: 3,
        name: "task_id",
        description: "The ID of the task to update",
        required: true,
      },
    ],
  },
  {
    name: "to_do_list",
    description: "Lists all the tasks",
  },
  {
    name: "your_to_do_list",
    description: "Lists all tasks assigned to that user",
  },
  {
    name: "connect-google-calendar",
    description: "Connect to your Google calender",
  },
  {
    name: "code-review",
    description: "Allows users them to ask for code reviews",
    options: [
      {
        type: 3,
        name: "github-link",
        description: "link for code-review",
        required: true,
      },
      {
        type: 3,
        name: "task_id",
        description: "The ID of the task to update",
        required: true,
      },
    ],
  },
  {
    name: "ask_ai",
    description: "Ask a question and get an answer from AI",
    options: [
      {
        type: 3, // Type 3 is a STRING
        name: "query",
        description: "The question you want to ask",
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
