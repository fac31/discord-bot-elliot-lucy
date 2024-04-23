const openAiChatbot = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.channel.name === "help" && !message.author.bot) {
      const query = message.content;
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
        message.reply(aiResponse);
      } catch (error) {
        console.error("Error calling OpenAI API:", error);
        message.reply("Sorry, I could not retrieve an answer at this time.");
      }
    }
  });
};

module.exports = openAiChatbot;
