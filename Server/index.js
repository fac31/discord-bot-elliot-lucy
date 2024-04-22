const path = require("path");
const { Client, Collection, Intents, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const dotenv = require("dotenv");
const TaskData = require("./models/task.js");
const CodeReviewData = require("./models/codeReview.js");
const TokenData = require("./models/tokens.js");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require('axios');

const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");

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
      Intents.FLAGS.MESSAGE_CONTENT
    ],
  });

client.commands = new Collection();

// TASK MANAGEMENT

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "add_task") {
    const taskDescription = interaction.options.getString("task");
    const assignee = interaction.options.getUser("assignee");
    const deadline = interaction.options.getString("deadline");

    const confirmationMessage = `Confirm Task Details:\nTask: ${taskDescription}\nAssigned to: ${assignee.username}\nDeadline: ${deadline}`;
    const confirmButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("confirm_add_task")
        .setLabel("Confirm")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("cancel_add_task")
        .setLabel("Cancel")
        .setStyle("DANGER")
    );

    await interaction.reply({
      content: confirmationMessage,
      components: [confirmButton],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === "confirm_add_task" || i.customId === "cancel_add_task";
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "confirm_add_task") {
        await i.update({
          content: `Task confirmed and added!`,
          components: [],
        });
        try {
          const task = new TaskData({
            assignee: assignee.username,
            deadline: deadline,
            description: taskDescription,
          });
          task.save();
        } catch (error) {
          console.log("Failed to create Task", error);
        }
      } else {
        await i.update({ content: `Task addition cancelled.`, components: [] });
      }
    });

    collector.on("end", (collected) =>
      console.log(`Collected ${collected.size} interactions.`)
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "code-review") {
    const taskId = interaction.options.getString("task_id");
    const githubLink = interaction.options.getString("github-link");

    const task = await TaskData.findById(taskId);

    const confirmationMessage = `Confirm Code-Review Details:\nTask: ${taskId}\nAssigned to: ${task.assignee}\nGithub link: ${githubLink}`;
    const confirmButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("confirm_add_task")
        .setLabel("Confirm")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("cancel_add_task")
        .setLabel("Cancel")
        .setStyle("DANGER")
    );

    const confirmationInteraction = await interaction.reply({
      content: confirmationMessage,
      components: [confirmButton],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === "confirm_add_task" || i.customId === "cancel_add_task";
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "confirm_add_task") {
        await i.update({
          content: `Task confirmed and added!`,
          components: [],
        });
        try {
          const codeReviewData = new CodeReviewData({
            link: githubLink,
            taskId: taskId,
          });
          await codeReviewData.save();

          const codeReviewChannel = client.channels.cache.get(
            "1231149737181188186"
          );

          if (!codeReviewChannel) {
            console.error("Code review channel not found.");
            return;
          }

          await codeReviewChannel.send(
            `Code Review needed for Task ID: ${taskId}\nAssigned to ${task.assignee}\nGithub Link: [GitHub link](${githubLink})`
          );
        } catch (error) {
          console.log("Failed to create Code Review", error);
        }
      } else {
        await i.update({
          content: `Code-Review addition cancelled.`,
          components: [],
        });
      }
      if (confirmationInteraction) {
        await confirmationInteraction.delete();
      } else {
        console.error("Confirmation interaction not found.");
      }
    });
    collector.on("end", (collected) =>
      console.log(`Collected ${collected.size} interactions.`)
    );
  }
});

// TASK TRACKING

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "update_task") {
    await handleUpdateTaskInteraction(interaction);
  }
});

async function handleUpdateTaskInteraction(interaction) {
  const taskId = interaction.options.getString("task_id");
  const taskDetails = `Task ID: ${taskId}`;

  const row = createTaskActionRow();

  try {
    await interaction.reply({
      content: taskDetails,
      components: [row],
      ephemeral: true,
    });

    const collector = createInteractionCollector(interaction, [
      "complete_task",
      "reassign_task",
      "post_help",
    ]);

    collector.on("collect", async (i) => {
      await handleTaskAction(i, taskId, collector);
    });

    collector.on("end", async (collected) => {
      console.log(`Collected ${collected.size} interactions.`);
    });
  } catch (error) {
    console.error("Error replying to interaction:", error);
  }
}

function createTaskActionRow() {
  return new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("complete_task")
      .setLabel("Complete Task")
      .setStyle("SUCCESS"),
    new MessageButton()
      .setCustomId("reassign_task")
      .setLabel("Reassign Task")
      .setStyle("PRIMARY"),
    new MessageButton()
      .setCustomId("post_help")
      .setLabel("Post to Help Channel")
      .setStyle("SECONDARY")
  );
}

function createInteractionCollector(interaction, customIds) {
  const filter = (i) =>
    customIds.includes(i.customId) && i.user.id === interaction.user.id;

  return interaction.channel.createMessageComponentCollector({
    filter,
    time: 60000,
  });
}

async function handleTaskAction(interaction, taskId, collector) {
  switch (interaction.customId) {
    case "complete_task":
      await completeTaskAction(interaction, taskId);
      break;
    case "reassign_task":
      await reassignTaskAction(interaction, taskId);
      break;
    case "post_help":
      await postHelpAction(interaction, taskId);
      break;
    default:
      break;
  }
  collector.stop(); // Stop collector after handling the action
}

async function completeTaskAction(interaction, taskId) {
  await interaction.update({
    content: `Task ${taskId} has been marked as completed and deleted.`,
    components: [],
  });

  try {
    await TaskData.findByIdAndDelete(taskId);
  } catch (error) {
    console.log("Error deleting Task:", error);
  }
}

async function reassignTaskAction(interaction, taskId) {
  const assigneeOptions = interaction.guild.members.cache.map((member) => ({
    label: member.user.username,
    value: member.user.id,
  }));

  const row = createAssigneeSelectMenu(assigneeOptions);

  try {
    await interaction.reply({
      content: `Task ID: ${taskId}`,
      components: [row],
    });

    const selectCollector = createInteractionCollector(interaction, [
      "select_assignee",
    ]);

    selectCollector.on("collect", async (i) => {
      if (i.customId === "select_assignee") {
        await handleAssigneeSelection(interaction, i, taskId, assigneeOptions);
      }
    });
  } catch (error) {
    console.error("Error replying to interaction:", error);
  }
}

function createAssigneeSelectMenu(assigneeOptions) {
  return new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("select_assignee")
      .setPlaceholder("Select an assignee")
      .addOptions(assigneeOptions)
  );
}

async function handleAssigneeSelection(
  interaction,
  selectInteraction,
  taskId,
  assigneeOptions
) {
  const selectedAssigneeId = selectInteraction.values[0];
  const selectedAssigneeUsername = assigneeOptions.find(
    (option) => option.value === selectedAssigneeId
  )?.label;

  try {
    const taskData = await TaskData.findByIdAndUpdate(
      taskId,
      { assignee: selectedAssigneeUsername },
      { new: true }
    );

    const replyContent = `Task ${taskId} reassigned to ${taskData.assignee}.`;

    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: replyContent,
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: replyContent,
        components: [],
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error updating Assignee:", error);
    await interaction.reply({
      content:
        "An error occurred while reassigning the task. Please try again later.",
      ephemeral: true,
    });
  }
}

async function postHelpAction(interaction, taskId) {
  const helpChannel = client.channels.cache.get("1231925121686704148");
  helpChannel.send(
    `${interaction.user.username} Needs help with Task ID: ${taskId}`
  );

  await interaction.update({
    content: `Task ${taskId} has been posted to the help channel.`,
    components: [],
  });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "to_do_list") {
    try {
      const tasks = await TaskData.find({});
      if (tasks.length > 0) {
        let taskList = "Here are all tasks on the to-do list:\n";
        tasks.forEach((task) => {
          taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee} - **Deadline:** ${task.deadline}\n`;
        });
        await interaction.reply({ content: taskList, ephemeral: true });
      } else {
        await interaction.reply({
          content: "No tasks found!",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Failed to retrieve tasks:", error);
      await interaction.reply({
        content: "Error retrieving tasks.",
        ephemeral: true,
      });
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "your_to_do_list") {
    try {
      const tasks = await TaskData.find({
        assignee: interaction.user.username,
      });

      if (tasks.length > 0) {
        let taskList = "Here are all tasks on the to-do list:\n";
        tasks.forEach((task) => {
          taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee} - **Deadline:** ${task.deadline}\n`;
        });
        await interaction.reply({ content: taskList, ephemeral: true });
      } else {
        await interaction.reply({
          content: "No tasks found!",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Failed to retrieve tasks:", error);
      await interaction.reply({
        content: "Error retrieving tasks.",
        ephemeral: true,
      });
    }
  }
});

// HELP
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "help") {
    const commandDescriptions = [
      {
        name: "/add_task",
        description:
          "Add a new task with optional details such as deadline and assignee.",
      },
      {
        name: "/update_task",
        description:
          "Update an existing task, mark as completed, reassign, or post for help.",
      },
      {
        name: "/to_do_list",
        description: "Lists all the tasks that have been added.",
      },
      {
        name: "/help",
        description: "Lists all available commands and their descriptions.",
      },
    ];

    let helpMessage = "Here are the commands you can use:\n";
    commandDescriptions.forEach((cmd) => {
      helpMessage += `**${cmd.name}** - ${cmd.description}\n`;
    });

    await interaction.reply({ content: helpMessage, ephemeral: true });
  }
});

//  GOOGLE CALENDER API
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "add_meet") {
    const summary = interaction.options.getString("summary");
    const startTime = interaction.options.getString("start-time");
    const endTime = interaction.options.getString("end-time");

    function getCurrentDateTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}T`;
    }

    const currentDateTime = getCurrentDateTime();

    const confirmationMessage = `Confirm Meet Details:\nSummary: ${summary}\nTime: ${startTime}-${endTime}`;
    const confirmButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("confirm_add_meet")
        .setLabel("Confirm")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("cancel_add_meet")
        .setLabel("Cancel")
        .setStyle("DANGER")
    );

    await interaction.reply({
      content: confirmationMessage,
      components: [confirmButton],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === "confirm_add_meet" || i.customId === "cancel_add_meet";
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      const userId = i.user.id;
      if (i.customId === "confirm_add_meet") {
        try {
          const event = {
            summary: summary,
            start: {
              dateTime: currentDateTime + startTime,
              timeZone: "Europe/London",
            },
            end: {
              dateTime: currentDateTime + endTime,
              timeZone: "Europe/London",
            },
            conferenceData: {
              createRequest: {
                requestId: uuidv4(),
              },
            },
          };

          const taskData = await TaskData.find({ userId });

          console.log(taskData);

          oauth2Client.setCredentials(taskData.tokens);

          const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client,
          });

          const meet = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
            conferenceDataVersion: 1,
          });
          await i.update({
            content: "Google Meet Created!",
            components: meet.data.hangoutLink,
          });
        } catch (error) {
          console.log("Failed to create meet", error);
        }
      } else {
        await i.update({ content: `Task addition cancelled.`, components: [] });
      }
    });

    collector.on("end", (collected) =>
      console.log(`Collected ${collected.size} interactions.`)
    );
  }

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
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "connect-google-calendar") {
    const connectButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setLabel("Connect Google Calendar")
        .setStyle("LINK")
        .setURL(authUrl)
    );

    await interaction.reply({
      content: "Click the button below to connect your Google Calendar:",
      components: [connectButton],
      ephemeral: true,
    });
    const tokenData = new TokenData({
      tokens: "hello",
      userId: interaction.user.id,
    });
    const savedTokenData = tokenData.save();
  }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ask_ai') {
        const query = options.getString('query');
        
        try {
            const response = await fetch(
                'https://api.openai.com/v1/chat/completions', {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                      model: 'gpt-3.5-turbo',
                      messages: [{
                        role: "user",
                        content: query
                      }]
                    })
                }
            );
            const data =  await response.json()
            const aiResponse = await data.choices[0].message.content;
            await interaction.reply({ content: aiResponse || 'I could not find an answer.', ephemeral: true });
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            await interaction.reply({ content: 'Failed to fetch the response from AI.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.channel.name === 'help' && !message.author.bot) {
        const query = message.content;
        try {
            const response = await fetch(
                'https://api.openai.com/v1/chat/completions', {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                      model: 'gpt-3.5-turbo',
                      messages: [{
                        role: "user",
                        content: query
                      }]
                    })
                }
            );
            const data =  await response.json()
            const aiResponse = await data.choices[0].message.content;
            message.reply(aiResponse);
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            message.reply('Sorry, I could not retrieve an answer at this time.');
        }
    }
});

client.login(token);
