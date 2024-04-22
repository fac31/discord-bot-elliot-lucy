const dotenv = require('dotenv');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

function configureEnv() {
	const envPath = path.resolve(__dirname, '.env');
	console.log('Loading environment variables from:', envPath);
	const result = dotenv.config({ path: envPath });
}
configureEnv();

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
				type: 6, // USER
				name: 'assignee',
				description: 'The user to assign the task to',
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
				type: 3, 
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
		name: 'your_to_do_list',
		description: 'Lists all tasks assigned to that user'
	},

	{
		name: 'help',
		description: 'Lists all available commands and their usage'
	},
	{
		name: 'code-review',
		description: 'Allows users them to ask for code reviews',
		options: [
			{
				type: 3,
				name: 'github-link',
				description: 'link for code-review',
				required: true
			},
			{
				type: 3, 
				name: 'task_id',
				description: 'The ID of the task to update',
				required: true
			}
		]
	},

	{
        name: 'ask_ai',
        description: 'Ask a question and get an answer from AI',
        options: [{
            type: 3, // Type 3 is a STRING
            name: 'query',
            description: 'The question you want to ask',
            required: true
        }]
    }
];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '9' }).setToken(token);

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