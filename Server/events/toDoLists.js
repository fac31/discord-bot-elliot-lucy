const TaskData = require("../models/task.js");

const toDoLists = (client) => {
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
};

module.exports = toDoLists;
