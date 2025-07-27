// /.netlify/functions/getWords.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { l1, tl, theme, count = 6 } = JSON.parse(event.body);

    console.log('Request received:', { l1, tl, theme, count });

    // Validate required parameters
    if (!l1 || !tl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required languages (l1, tl)' }),
      };
    }

    // Handle empty theme by providing a fallback
    const actualTheme = theme && theme.trim() 
      ? theme.trim() 
      : 'basic everyday vocabulary (common objects, actions, adjectives)';

    console.log('Using theme:', actualTheme);

    // Create the prompt for OpenAI
    const prompt
