const { MessageActionRow, MessageButton } = require("discord.js");
const TokenData = require("../models/tokens.js");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");

const addMeeting = (client, oauth2Client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "add_meeting") {
      const summary = interaction.options.getString("summary");
      const startTime = interaction.options.getString("start-time");
      const endTime = interaction.options.getString("end-time");

      function getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}T`;
      }

      const currentDateTime = getCurrentDateTime();

      const confirmationMessage = `Confirm Meet Details:\nSummary: ${summary}\nTime: ${startTime}-${endTime}`;
      const confirmButton = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("confirm_add_meet")
          .setLabel("Confirm")
          .setStyle("SUCCESS"),
        new MessageButton()
          .setCustomId("cancel_add_meet")
          .setLabel("Cancel")
          .setStyle("DANGER")
      );

      await interaction.reply({
        content: confirmationMessage,
        components: [confirmButton],
        ephemeral: true,
      });

      const filter = (i) =>
        i.customId === "confirm_add_meet" || i.customId === "cancel_add_meet";
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
      });

      collector.on("collect", async (i) => {
        const userId = i.user.id;
        if (i.customId === "confirm_add_meet") {
          try {
            const event = {
              summary: summary,
              start: {
                dateTime: currentDateTime + startTime,
                timeZone: "Europe/London",
              },
              end: {
                dateTime: currentDateTime + endTime,
                timeZone: "Europe/London",
              },
              conferenceData: {
                createRequest: {
                  requestId: uuidv4(),
                },
              },
            };

            const tokenData = await TokenData.find({ userID: userId });

            oauth2Client.setCredentials(tokenData[0].tokens);

            const calendar = google.calendar({
              version: "v3",
              auth: oauth2Client,
            });

            const meet = await calendar.events.insert({
              calendarId: "primary",
              requestBody: event,
              conferenceDataVersion: 1,
            });
            const meetButton = new MessageButton()
              .setStyle("LINK")
              .setLabel("Google Meet Link")
              .setURL(meet.data.hangoutLink);

            const meetRow = new MessageActionRow().addComponents(meetButton);

            await i.update({
              content: "Google Meet Created!",
              components: [meetRow],
            });
          } catch (error) {
            console.log("Failed to create meet", error);
          }
        } else {
          await i.update({
            content: `Task addition cancelled.`,
            components: [],
          });
        }
      });

      collector.on("end", (collected) =>
        console.log(`Collected ${collected.size} interactions.`)
      );
    }
  });
};

module.exports = addMeeting;
