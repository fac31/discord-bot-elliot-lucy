const { MessageEmbed } = require("discord.js");

const askAi = (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand()) return;
      
        const { commandName, options } = interaction;
      
        if (commandName === "ask_ai") {
          const query = options.getString("query");
      
          try {
            const response = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "gpt-3.5-turbo",
                  messages: [
                    {
                      role: "user",
                      content: query,
                    },
                  ],
                }),
              }
            );
            const data = await response.json();
            const aiResponse = await data.choices[0].message.content;

            const aiEmbed = new MessageEmbed()
                    .setColor('#36454F') 
                    .setTitle('AI Response')
                    .setDescription(aiResponse || "I could not find an answer.")
                    .setFooter('Response provided by OpenAI');

            await interaction.reply({
              embeds: [aiEmbed], 
              ephemeral: true,
            });
          } catch (error) {
            console.error("Error calling OpenAI API:", error);
            const errorEmbed = new MessageEmbed()
                    .setColor('#ff0000') 
                    .setTitle('Error')
                    .setDescription("Failed to fetch the response from AI.");

            await interaction.reply({
              embeds: [errorEmbed],
              ephemeral: true,
            });
          }
        }
      });
}

module.exports = askAi
