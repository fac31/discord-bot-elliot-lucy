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
            await interaction.reply({
              content: aiResponse || "I could not find an answer.",
              ephemeral: true,
            });
          } catch (error) {
            console.error("Error calling OpenAI API:", error);
            await interaction.reply({
              content: "Failed to fetch the response from AI.",
              ephemeral: true,
            });
          }
        }
      });
}

module.exports = askAi
