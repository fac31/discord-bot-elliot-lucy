const { Client, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const TaskData = require("../models/task.js");

const updateTask = (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand() || interaction.commandName !== "update_task") return;

        const taskIdentifier = interaction.options.getString("task_identifier");
        const task = await TaskData.findOne({ description: taskIdentifier });

        if (!task) {
            await interaction.reply({ content: "Task not found", ephemeral: true });
            return;
        }

        const taskEmbed = new MessageEmbed()
            .setColor('#36454F')
            .setTitle('Task Update Actions')
            .setDescription(`**Description:** ${task.description}\n**Assigned to:** ${task.assignee}\n**Deadline:** ${task.deadline}`)
            .setFooter('Select an action to perform');

        const row = new MessageActionRow().addComponents(
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

        await interaction.reply({
            embeds: [taskEmbed],
            components: [row],
            ephemeral: true,
        });

        const filter = (i) => ['complete_task', 'reassign_task', 'post_help'].includes(i.customId) && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on("collect", async (i) => {
            switch (i.customId) {
                case "complete_task":
                    await completeTaskAction(i, task._id);
                    break;
                case "reassign_task":
                    await reassignTaskAction(i, task);
                    break;
                case "post_help":
                    await postHelpAction(i, task);
                    break;
            }
            collector.stop();
        });

        collector.on("end", (collected) => console.log(`Collected ${collected.size} interactions.`));
    });
}

async function completeTaskAction(interaction, taskId) {
    try {
        await TaskData.findByIdAndDelete(taskId);
        await interaction.update({ content: `Task has been marked as completed and deleted.`, components: [] });
    } catch (error) {
        console.log("Error deleting Task:", error);
        await interaction.update({ content: `Failed to delete task due to an error.`, components: [] });
    }
}

async function reassignTaskAction(interaction, task) {
    const assigneeOptions = interaction.guild.members.cache.map(member => ({
        label: member.user.username,
        value: member.id
    }));

    const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId("select_assignee")
            .setPlaceholder("Select an assignee")
            .addOptions(assigneeOptions)
    );

    await interaction.update({ content: `Reassign Task: ${task.description}`, components: [row] });
}

async function postHelpAction(interaction, task) {
    const helpChannel = client.channels.cache.get("1231925121686704148");
    await helpChannel.send(`${interaction.user.username} needs help with a task. Description: ${task.description}`);
    await interaction.update({ content: `Task has been posted to the help channel.`, components: [] });
}

module.exports = updateTask;