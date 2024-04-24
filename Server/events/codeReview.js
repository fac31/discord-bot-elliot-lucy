const { Client, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const CodeReviewData = require("../models/codeReview.js");
const TaskData = require("../models/task.js");

const codeReview = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "code-review") {
      const taskId = interaction.options.getString("task_id");

      try {
        const task = await TaskData.findById(taskId);
        if (!task) {
          await interaction.reply({ content: "Task not found.", ephemeral: true });
          return;
        }

        const detailsEmbed = new MessageEmbed()
          .setColor('#36454F') 
          .setTitle('Confirm Code Review Details')
          .setDescription('Please confirm the details below:')
          .addField('Assigned to', task.assignee, true)
          .addField('GitHub Link', `[View on GitHub](${task.githubLink})`, false);

          const actionRow = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId(`confirm-${taskId}`) 
              .setLabel("Confirm")
              .setStyle("SUCCESS"),
            new MessageButton()
              .setCustomId(`cancel-${taskId}`)
              .setLabel("Cancel")
              .setStyle("DANGER")
          );
  

          await interaction.reply({
            embeds: [detailsEmbed],
            components: [actionRow],
            ephemeral: true,
          });

          const filter = (i) => i.user.id === interaction.user.id;
          const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
  

          collector.on("collect", async (i) => {
            const [action, id] = i.customId.split('-');
  
            if (action === "confirm") {
              await i.update({ content: `Code review confirmed for task ID ${id}.`, components: [] });
            } else if (action === "cancel") {
              await i.update({ content: "Code-Review addition cancelled.", components: [] });
            }
          });
  
          collector.on("end", collected => console.log(`Collected ${collected.size} interactions.`));
        } catch (error) {
          console.error("Error handling the code review command:", error);
          await interaction.reply({ content: "Failed to process code review command.", ephemeral: true });
        }
      }
    });
  }

module.exports = codeReview