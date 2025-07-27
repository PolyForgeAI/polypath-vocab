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
    console.log('Raw event body:', event.body);
    const { l1, tl, theme, count = 6 } = JSON.parse(event.body);

    console.log('Parsed request:', { l1, tl, theme, count });

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
      : 'basic everyday vocabulary';

    console.log('Using theme:', actualTheme);

    // Create the prompt for OpenAI
    const prompt = `Generate exactly ${count} common ${actualTheme} words. 
    
Return a JSON object with this exact structure:
{
  "words": [
    {"native": "${l1} word", "target": "${tl} translation"},
    {"native": "${l1} word", "target": "${tl} translation"}
  ]
}

Requirements:
- Provide exactly ${count} word pairs
- Use common, useful vocabulary appropriate for A1-A2 level learners
- Words should be single words or simple phrases (no sentences)
- Ensure translations are accurate
- Return only valid JSON, no additional text

Source language: ${l1}
Target language: ${tl}
Theme: ${actualTheme}`;

    console.log('Sending prompt to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a language learning assistant. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    console.log('OpenAI response received');
    
    const responseText = completion.choices[0].message.content.trim();
    console.log('Raw OpenAI response:', responseText);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Unparseable response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response structure
    if (!parsedResponse.words || !Array.isArray(parsedResponse.words)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response structure from AI');
    }

    // Ensure we have the right number of words
    const words = parsedResponse.words.slice(0, count);
    
    if (words.length === 0) {
      throw new Error('No words generated');
    }

    console.log(`Successfully generated ${words.length} words`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        words: words,
        theme: actualTheme,
        count: words.length
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Failed to generate words: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
