const fetch = require('node-fetch');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, headers, body: 'Invalid JSON' };
  }
  const { l1, tl, theme } = body;
  if (!l1 || !tl || !theme) {
    return { statusCode: 400, headers, body: 'Missing parameters' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: 'Missing API key' };
  }

  const prompt = `Provide five unique ${theme} words in ${tl} with their translations in ${l1}. Respond with a JSON array of objects with \"word\" and \"translation\" fields.`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that returns JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
        n: 1
      })
    });

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    let words;
    try {
      words = JSON.parse(content);
    } catch (err) {
      return { statusCode: 500, headers, body: 'Invalid JSON returned from OpenAI' };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ words })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: 'Error calling OpenAI API' };
  }
};
