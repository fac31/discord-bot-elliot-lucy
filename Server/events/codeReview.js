const { MessageActionRow, MessageButton } = require("discord.js");
const CodeReviewData = require("../models/codeReview.js");
const TaskData = require("../models/task.js");

const codeReview = (client) => {
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
              `Code Review needed for Task: ${task.description}\nAssigned to ${task.assignee}\nGithub Link: [GitHub link](${githubLink})`
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
}

module.exports = codeReview