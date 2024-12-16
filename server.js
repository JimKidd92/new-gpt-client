// server.js
const express = require('express');
const axios = require('axios');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const allowedModels = ['gpt-3.5-turbo', 'gpt-4'];

app.post('/chat', async (req, res) => {
  const conversationHistory = req.body.history;
  const selectedModel = req.body.model || 'gpt-3.5-turbo';

  if (!Array.isArray(conversationHistory)) {
    return res.status(400).json({ reply: 'Invalid conversation history format.' });
  }

  if (!allowedModels.includes(selectedModel)) {
    return res.status(400).json({ reply: 'Invalid model selected.' });
  }

  try {
    const apiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: selectedModel,
        messages: conversationHistory,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const botReply = apiResponse.data.choices[0].message.content;
    res.json({ reply: botReply });
  } catch (error) {
    console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ reply: 'Sorry, there was an error processing your request.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});