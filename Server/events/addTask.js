const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const TaskData = require("../models/task"); 

const addTask = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "add_task") {
      const taskDescription = interaction.options.getString("task");
      const assignee = interaction.options.getUser("assignee");
      const deadline = interaction.options.getString("deadline");

      const confirmationEmbed = new MessageEmbed()
        .setColor('#36454F')
        .setTitle('Confirm Task Addition')
        .setDescription('Please confirm the addition of the following task:')
        .addField('Task Description', taskDescription, false)
        .addField('Assigned to', assignee.username, true)
        .addField('Deadline', deadline, true);

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
        embeds: [confirmationEmbed],
        components: [confirmButton],
        ephemeral: true,
      });

      const filter = (i) => ['confirm_add_task', 'cancel_add_task'].includes(i.customId) && i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "confirm_add_task") {
          try {
            const task = new TaskData({
              assignee: assignee.username,
              deadline: deadline,
              description: taskDescription,
            });
            await task.save();
            await i.update({ content: `Task confirmed and added!`, embeds: [], components: [] });
          } catch (error) {
            console.log("Failed to create Task", error);
            await i.update({ content: `Failed to save task due to an error.`, embeds: [], components: [] });
          }
        } else if (i.customId === "cancel_add_task") {
          await i.update({ content: `Task addition cancelled.`, embeds: [], components: [] });
        }
      });

      collector.on("end", (collected) =>
        console.log(`Collected ${collected.size} interactions.`)
      );
    }
  });
}

module.exports = addTask;  