const functions = require("firebase-functions");
const axios = require("axios");

exports.aiChat = functions
  .region("asia-southeast1")
  .runWith({ secrets: ["GEMINI_API_KEY"] })   // <-- DO NOT PUT THE KEY HERE
  .https.onCall(async (data) => {
    const userText = data.text;

    if (!userText) {
      return { reply: "I didn’t receive any message. Please try again." };
    }

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [{ text: userText }],
            },
          ],
        }
      );

      const reply =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't understand that.";

      return { reply };
    } catch (error) {
      console.error("Gemini API Error:", error.response?.data || error.message);
      return {
        reply: "AI service error. Please try again later.",
      };
    }
  });
