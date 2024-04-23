const { MessageActionRow, MessageButton } = require("discord.js");
const TaskData = require("../models/task");

const addTask = (client) => {
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
}

module.exports = addTask  