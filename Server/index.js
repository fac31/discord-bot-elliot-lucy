import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

import Task from './models/Task'

function configureEnv() {
    const envPath = path.resolve(fileURLToPath(import.meta.url), '../.env');
    console.log('Loading environment variables from:', envPath);
    const result = dotenv.config({ path: envPath });
}
configureEnv()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.TOKEN;

const client = new Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ], });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// TASK MANAGEMENT 

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'add_task') {
        const taskDescription = interaction.options.getString('description');
        const assignee = interaction.options.getUser('assignee');
        const deadline = interaction.options.getString('deadline');

        // Confirm the task details with the user
        const confirmationMessage = `Confirm Task Details:\nTask: ${taskDescription}\nAssigned to: ${assignee.username}\nDeadline: ${deadline}`;
        const confirmButton = new MessageActionRow()
            .addComponents(
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
                // Here, integrate with your task management system or database
            } else {
                await i.update({ content: `Task addition cancelled.`, components: [] });
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

        // Fetch task details from your database or task management system here
        const taskDetails = `Task Details Placeholder for ID: ${taskId}`; // Replace this with actual fetch logic

        const row = new MessageActionRow()
            .addComponents(
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

        await interaction.reply({ content: taskDetails, components: [row], ephemeral: true });

        const filter = i => ['complete_task', 'reassign_task', 'post_help'].includes(i.customId) && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'complete_task') {
                // Logic to mark task as completed and delete it
                await i.update({ content: `Task ${taskId} has been marked as completed and deleted.`, components: [] });
                // Update your database here
            } else if (i.customId === 'reassign_task') {
                // Additional interaction to select a new assignee
                // Placeholder: You need to implement actual user selection
                await i.update({ content: `Please implement user selection for reassignment.`, components: [] });
            } else if (i.customId === 'post_help') {
                // Logic to post this task to a help or debug channel
                const helpChannel = client.channels.cache.get('your-help-channel-id'); // Replace with actual channel ID
                helpChannel.send(`Need help with Task ID: ${taskId}`);
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
        // Example tasks array, replace this with your actual task fetching logic
        const tasks = [
            { id: 1, description: 'Fix bug in login module', assignee: 'Alice', deadline: '2024-04-25' },
            { id: 2, description: 'Update documentation', assignee: 'Bob', deadline: '2024-04-30' }
        ];

        // Format tasks into a message
        if (tasks.length > 0) {
            let taskList = 'Here are the tasks on your to-do list:\n';
            tasks.forEach(task => {
                taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee} - **Deadline:** ${task.deadline}\n`;
            });
            await interaction.reply({ content: taskList, ephemeral: true });
        } else {
            await interaction.reply({ content: "No tasks found!", ephemeral: true });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'to_do_list') {
        try {
            const tasks = await Task.find({}); // Fetch all tasks

            if (tasks.length > 0) {
                let taskList = 'Here are the tasks on your to-do list:\n';
                tasks.forEach(task => {
                    taskList += `**ID:** ${task.id} - **Task:** ${task.description} - **Assigned to:** ${task.assignee.username} - **Deadline:** ${task.deadline.toISOString().slice(0, 10)}\n`;
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
        // Manually defining command descriptions - consider automating or fetching these from a central store
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



for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        import(filePath).then(module => {
            const command = module.default;
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }).catch(error => {
            console.error(`Error importing command at ${filePath}: ${error}`);
        });
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
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
