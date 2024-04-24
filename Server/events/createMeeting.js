const { MessageActionRow, MessageButton } = require("discord.js");
const TokenData = require("../models/tokens.js");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");
const timeFormatter = require("../utils/timeFormatter.js");

const addMeeting = (client, oauth2Client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "create_meeting") {
      const summary = interaction.options.getString("summary");
      const startTime = interaction.options.getString("start-time");
      const endTime = interaction.options.getString("end-time");
      const assignee = interaction.options.getUser("assignee");
      const dateDay = interaction.options.getString("day");
      const dateMonth = interaction.options.getString("month");
      const dateYear = interaction.options.getString("year");

      function getCurrentDateTime(year, month, day) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T`;
      }

      const currentDateTime = getCurrentDateTime(dateYear, dateMonth, dateDay);

      const { startTimeISO, endTimeISO } = timeFormatter(startTime, endTime);

      const confirmationMessage = `Confirm Meet Details:\nSummary: ${summary}\nTime: ${startTime}-${endTime}\nAttendees: ${assignee.username}\nDate: ${dateDay}/${dateMonth}/${dateYear}`;
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

      const attendee = await TokenData.findOne({ userID: assignee.id });

      collector.on("collect", async (i) => {
        const userId = i.user.id;
        if (i.customId === "confirm_add_meet") {
          const eventMaker = (attendee) => {
            let event;
            if (attendee) {
              event = {
                summary: summary,
                start: {
                  dateTime: currentDateTime + startTimeISO,
                  timeZone: "Europe/London",
                },
                end: {
                  dateTime: currentDateTime + endTimeISO,
                  timeZone: "Europe/London",
                },
                attendees: [{ email: attendee.userEmail }],
                conferenceData: {
                  createRequest: {
                    requestId: uuidv4(),
                  },
                },
              };
              return event;
            } else {
              event = {
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
              return event;
            }
          };

          const event = eventMaker(attendee);

          try {
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

            try {
              const user = await client.users.fetch(assignee.id);
              await user.send(
                `${interaction.user.username} has invited you to a new meeting: ${meet.data.hangoutLink}`
              );
            } catch (error) {
              console.error(`Failed to send DM to user ${assignee.id}:`, error);
            }
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
