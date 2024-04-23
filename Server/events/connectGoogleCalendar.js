const { MessageActionRow, MessageButton } = require("discord.js");
const TokenData = require("../models/tokens.js");

const connectGoogleCalendar = (client, authUrl) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "connect-google-calendar") {
      try {
        const tokenData = await TokenData.findOne({
          userID: interaction.user.id,
        });

        if (tokenData) {
          interaction.reply({
            content: "Google Calender already connected!",
          })
        } else {
          const connectButton = new MessageActionRow().addComponents(
            new MessageButton()
              .setLabel("Connect Google Calendar")
              .setStyle("LINK")
              .setURL(authUrl)
          );

          await interaction.reply({
            content: "Click the button below to connect your Google Calendar:",
            components: [connectButton],
            ephemeral: true,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
};

module.exports = connectGoogleCalendar;
