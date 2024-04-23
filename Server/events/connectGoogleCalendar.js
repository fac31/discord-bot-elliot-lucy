const { MessageActionRow, MessageButton } = require("discord.js");
const TokenData = require("../models/tokens.js");

const connectGoogleCalendar = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "connect-google-calendar") {
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
      const tokenData = new TokenData({
        tokens: "hello",
        userId: interaction.user.id,
      });
      tokenData.save();
    }
  });
};

module.exports = connectGoogleCalendar;
