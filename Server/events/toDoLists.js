const { Client, MessageEmbed } = require("discord.js");
const TaskData = require("../models/task.js");

const toDoLists = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "to_do_list" || commandName === "your_to_do_list") {
      try {
        const query = (commandName === "your_to_do_list") ? { assignee: interaction.user.username } : {};
        const tasks = await TaskData.find(query);

        if (tasks.length > 0) {
          const embed = new MessageEmbed()
            .setColor('#36454F')
            .setTitle('Tasks To-Do List')
            .setDescription('Here are the tasks currently assigned:');

          tasks.forEach((task, index) => {
            embed.addField(`Task ${index + 1}`, `**Description:** ${task.description}\n**Assigned to:** ${task.assignee}\n**Deadline:** ${task.deadline}`, false);
          });

          await interaction.reply({ embeds: [embed], ephemeral: true });
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
