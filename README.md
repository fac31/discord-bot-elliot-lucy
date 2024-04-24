# Discord Chatbot 🤖💬

## A Discord Chatbot for Developers to assist in managing their workflow
## Made using Node and Express by Elliot and Lucy as part of the Founders and Coders course

### What the Bot can do 
<img width="400" alt="Screenshot 2024-04-24 at 16 38 09" src="https://github.com/fac31/discord-bot-elliot-lucy/assets/154347220/6d72dd6d-ed8d-4d8b-be80-d8d648d98a96">

The Bot enables Developers to do the following:

##/Add Task

Add a Task to their To Do list, stored on MongoDB. Users have the option to add a:
1. Description of the Task
2. Assign it to a Team Member
3. Set a Deadline

##/Update Task
Change the Status of a Task on the To Do list:
1. Mark as completed
2. Re-assign to another Team Member
3. Post to coding-help channel

##/To Do List
Lists all the tasks entered into the database for everybody on the team

##/Your To Do List
Lists all the tasks entered into the database for the user who requests their To Do List

##/Ask AI
1. Enables Developers to access the OpenAI API and ask for coding help
2. Also included as a feature within the coding-help channel, to enable Users to ask AI to solve their problems.

##/Code Review
Enables a User to post a GitHub link and ask for a code review

Connect Google Calendar
Enables a User to attach to their google calendar so that they can keep track of meetings 

Create Meeting
Enables a User to set up a meeting 

### Prerequisites

To get this bot working, we need access to the following:

- **Server ID of a guild** 
- **Token of a Discord bot** 
- **An OpenAI Key**

#### Guild Server ID

1. Enable developer mode (Discord desktop) by pressing the cog next to your profile icon to enter settings, selecting `Advanced`, and toggling on Developer Mode.
2. After exiting settings, right-click on the guild to which you want to add the bot and select `Copy Server ID`. Make a note of that somewhere.
   - **Note**: If you want to add the bot to someone else's guild, make sure to have their permissions first. If you don't have the required permissions, you'll also need to ask them to add the bot to the guild for you.

#### Discord Bot Token

Assuming you're generating a Discord app for the first time:

1. Login to the [Discord developer portal](https://discord.com/developers/applications).
2. Create a New Application.
3. Select your bot & click on `Bot` on the LHS menu.
4. Click on `Reset Token` and make a note of it for later. If you lose this token, you'll need to generate a new one.
5. Generate a Permission Integer by using the tool at the bottom of the Bot menu. Keep in mind that for the bot to function as intended, it needs to be able to moderate users on top of other permissions like sending & receiving messages. We recommend using the following permissions integer: `1995012435014`.
6. Navigating to the `OAuth2` menu on the left, make a note of the `Client ID`.
7. Construct a URL of the following format: `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot&permissions=PERMISSIONS_INTEGER`, replacing `CLIENT_ID` and `PERMISSIONS_INTEGER` with the values found above.
8. By following the link, add the bot to the server with the same Guild Server ID. **Note**: if you're not an admin on the server, send this link to someone who is.

#### OpenAI Key

Assuming this is your first time dealing with OpenAI's API:

1. After creating an OpenAI account, navigate to the API keys menu.
2. Create a new Secret Key and make a note of it.
3. Make sure you have some credit available.

### Installation Steps

1. `git clone` the repository & navigate into it.
2. Run `npm install` to install all packages required.
3. Create a `.env` file and copy the contents into it from `.env-template`.
4. Inside the `.env` file, fill in the values of the Server ID, Discord Bot Token, and OpenAI API key with the values you've acquired from following the Prerequisite steps.
5. Start the project using `npm start`.




