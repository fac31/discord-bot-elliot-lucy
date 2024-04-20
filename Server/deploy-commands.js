import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const token = process.env.TOKEN
const guildId = process.env.GUILDID
const clientId = process.env.CLIENTID

const commands = [
	{
        name: 'add_task',
        description: 'Add a new task with an optional deadline',
        options: [
            {
                type: 3, // 3 is type STRING
                name: 'task',
                description: 'The task description',
                required: true,
            },
            {
                type: 3, // 3 is type STRING
                name: 'deadline',
                description: 'The deadline for the task (optional)',
                required: false
            }
        ]
    },

					{
						name: 'update_task',
						description: 'Update an existing task',
						options: [
							{
								type: 3, // STRING type
								name: 'task_id',
								description: 'The ID of the task to update',
								required: true
							}
						]
					},

					{
						name: 'to_do_list',
						description: 'Lists all the tasks'
					},

					{
						name: 'help',
						description: 'Lists all available commands and their usage'
					},

];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = join(__dirname, 'Commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = join(foldersPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();