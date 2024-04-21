const path = require('path');
const { Client, Collection, Intents, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const dotenv = require('dotenv');
const TaskData = require('./models/task.js');
const CodeReviewData = require('./models/github.js')
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

function configureEnv() {
    const envPath = path.resolve(__dirname, '.env');
    console.log('Loading environment variables from:', envPath);
    const result = dotenv.config({ path: envPath });
}
configureEnv();


const app = express();
app.use(cors());

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on('error', (error) => console.log(error));
db.once('open', () => console.log('Connected to database'));

app.use(express.json());

const token = process.env.TOKEN;

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT,
    ],
});

client.commands = new Collection();

// TASK MANAGEMENT 

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'add_task') {
        const taskDescription = interaction.options.getString('task');
        const assignee = interaction.options.getUser('assignee');
        const deadline = interaction.options.getString('deadline');

        const confirmationMessage = `Confirm Task Details:\nTask: ${taskDescription}\nAssigned to: ${assignee.username}\nDeadline: ${deadline}`;
        const confirmButton = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('confirm_add_task')
                .setLabel('Confirm')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancel_add_task')
                .setLabel('Cancel')
                .setStyle('DANGER')
        );

        await interaction.reply({ content: confirmationMessage, components: [confirmButton], ephemeral: true });

        const filter = i => i.customId === 'confirm_add_task' || i.customId === 'cancel_add_task';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_add_task') {
                await i.update({ content: `Task confirmed and added!`, components: [] });
                try {
                    const task = new TaskData({
                        assignee: assignee.username,
                        deadline: deadline,
                        description: taskDescription
                    })
                    task.save()
                } catch (error) {
                    console.log('Failed to create Task', error);
                }
            } else {
                await i.update({ content: `Task addition cancelled.`, components: [] });
            }
        });

        collector.on('end', collected => console.log(`Collected ${collected.size} interactions.`));
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'code-review') {
        const taskId = interaction.options.getString('task_id');
        const githubLink = interaction.options.getString('github-link');

        const task = await TaskData.findById(taskId);

        const confirmationMessage = `Confirm Code-Review Details:\nTask: ${taskId}\nAssigned to: ${task.assignee}\nGithub link: ${githubLink}`;
        const confirmButton = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('confirm_add_task')
                .setLabel('Confirm')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancel_add_task')
                .setLabel('Cancel')
                .setStyle('DANGER')
        );

        const confirmationInteraction = await interaction.reply({ content: confirmationMessage, components: [confirmButton], ephemeral: true });

        const filter = i => i.customId === 'confirm_add_task' || i.customId === 'cancel_add_task';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_add_task') {
                await i.update({ content: `Task confirmed and added!`, components: [] });
                try {
                    const codeReviewData = new CodeReviewData({
                        link: githubLink,
                        taskId: taskId
                    });
                    await codeReviewData.save();

                    const codeReviewChannel = client.channels.cache.get('1231149737181188186');

                    if (!codeReviewChannel) {
                        console.error('Code review channel not found.');
                        return;
                    }

                    await codeReviewChannel.send(`Code Review needed for Task ID: ${taskId}\nAssigned to ${task.assignee}\nGithub Link: [GitHub link](${githubLink})`);
                } catch (error) {
                    console.log('Failed to create Code Review', error);
                }
            } else {
                await i.update({ content: `Code-Review addition cancelled.`, components: [] });
            }
            if (confirmationInteraction) {
                await confirmationInteraction.delete();
            } else {
                console.error('Confirmation interaction not found.');
            }
        });
        collector.on('end', collected => console.log(`Collected ${collected.size} interactions.`));
    }
});



// TASK TRACKING 

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'update_task') {
        const taskId = interaction.options.getString('task_id');

        const taskDetails = `Task ID: ${taskId}`;

        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('complete_task')
                .setLabel('Complete Task')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('reassign_task')
                .setLabel('Reassign Task')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('post_help')
                .setLabel('Post to Help Channel')
                .setStyle('SECONDARY')
        );

        interaction.reply({ content: taskDetails, components: [row], ephemeral: true });

        const filter = i => ['complete_task', 'reassign_task', 'post_help'].includes(i.customId) && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'complete_task') {
                await i.update({ content: `Task ${taskId} has been marked as completed and deleted.`, components: [] });
                try {
                    await TaskData.findByIdAndDelete(taskId)
                } catch (error) {
                    console.log('Error deleting Task');
                }
            } else if (i.customId === 'reassign_task') {
                const assigneeOptions = interaction.guild.members.cache.map(member => ({
                    label: member.user.username,
                    value: member.user.id
                }));
                const row = new MessageActionRow().addComponents(
                    new MessageSelectMenu()
                        .setCustomId('select_assignee')
                        .setPlaceholder('Select an assignee')
                        .addOptions(assigneeOptions)
                );
                await interaction.followUp({ content: taskDetails, components: [row] });

                const filter = i => i.customId === 'select_assignee' && i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async interaction => {
                    const selectedAssigneeId = interaction.values[0];
                    const assigneeObject = { assignee: selectedAssigneeId }
                    try {
                        await TaskData.findByIdAndUpdate(taskId, assigneeObject, { new: true });
                        await interaction.reply({ content: `Task ${taskId} reassigned to user ${selectedAssigneeId}.`, ephemeral: true });
                    } catch (error) {
                        console.error('Error updating Assignee:', error);
                        await interaction.reply({ content: 'An error occurred while reassigning the task. Please try again later.', ephemeral: true });
                    }
                });
            } else if (i.customId === 'post_help') {
                const helpChannel = client.channels.cache.get('1231514334056812574');
                helpChannel.send(`${interaction.user.username} Needs help with Task ID: ${taskId}`);
                await i.update({ content: `Task ${taskId} has been posted to the help channel.`, components: [] });
            }
        });

        collector.on('end', collected => console.log(`Collected ${collected.size} interactions.`));
    }
});

// PRODUCTIVITY TOOLS
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'to_do_list') {
        try {
            const tasks = await TaskData.find({});

            if (tasks.length > 0) {
                let taskList = 'Here are all tasks on the to-do list:\n';
                tasks.forEach(task => {
                    taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee} - **Deadline:** ${task.deadline}\n`;
                });
                await interaction.reply({ content: taskList, ephemeral: true });
            } else {
                await interaction.reply({ content: "No tasks found!", ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to retrieve tasks:', error);
            await interaction.reply({ content: "Error retrieving tasks.", ephemeral: true });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'your_to_do_list') {
        try {
            const tasks = await TaskData.find({'assignee': interaction.user.username});

            if (tasks.length > 0) {
                let taskList = 'Here are all tasks on the to-do list:\n';
                tasks.forEach(task => {
                    taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee} - **Deadline:** ${task.deadline}\n`;
                });
                await interaction.reply({ content: taskList, ephemeral: true });
            } else {
                await interaction.reply({ content: "No tasks found!", ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to retrieve tasks:', error);
            await interaction.reply({ content: "Error retrieving tasks.", ephemeral: true });
        }
    }
});

// HELP

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        const commandDescriptions = [
            { name: '/add_task', description: 'Add a new task with optional details such as deadline and assignee.' },
            { name: '/update_task', description: 'Update an existing task, mark as completed, reassign, or post for help.' },
            { name: '/to_do_list', description: 'Lists all the tasks that have been added.' },
            { name: '/help', description: 'Lists all available commands and their descriptions.' }
        ];

        let helpMessage = 'Here are the commands you can use:\n';
        commandDescriptions.forEach(cmd => {
            helpMessage += `**${cmd.name}** - ${cmd.description}\n`;
        });

        await interaction.reply({ content: helpMessage, ephemeral: true });
    }
});

client.once('ready', readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.login(token);
