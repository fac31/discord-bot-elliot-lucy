const { MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const TaskData = require("../models/task.js");

const updateTask = (client) => {
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
}

module.exports = updateTask