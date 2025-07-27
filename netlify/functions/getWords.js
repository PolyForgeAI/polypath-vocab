exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const { l1, tl, theme } = JSON.parse(event.body);

        // Validate inputs
        if (!l1 || !tl || !theme) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters: l1, tl, theme' })
            };
        }

        if (l1 === tl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Native and target languages must be different' })
            };
        }

        // Check for OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'OpenAI API key not configured' })
            };
        }

        // Prepare the prompt for OpenAI
        const prompt = `Generate exactly 5 vocabulary words related to the theme "${theme}" in ${tl} with their translations in ${l1}. 

Return the response in this exact JSON format:
{
  "words": [
    {"target": "word_in_${tl}", "native": "translation_in_${l1}"},
    {"target": "word_in_${tl}", "native": "translation_in_${l1}"},
    {"target": "word_in_${tl}", "native": "translation_in_${l1}"},
    {"target": "word_in_${tl}", "native": "translation_in_${l1}"},
    {"target": "word_in_${tl}", "native": "translation_in_${l1}"}
  ]
}

Important guidelines:
- Choose common, useful vocabulary words that beginners would benefit from learning
- Ensure all words are directly related to the theme "${theme}"
- Provide accurate translations
- Use proper spelling and formatting for both languages
- Return only the JSON object, no additional text or markdown formatting
- Make sure the JSON is valid and parseable`;

        // Call OpenAI API using built-in fetch (Node.js 18+)
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.text();
            console.error('OpenAI API error:', errorData);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to generate words from OpenAI' })
            };
        }

        const openaiData = await openaiResponse.json();
        
        if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
            console.error('Unexpected OpenAI response format:', openaiData);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Invalid response from OpenAI' })
            };
        }

        let responseText = openaiData.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse the JSON response
        let wordsData;
        try {
            wordsData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response text:', responseText);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to parse OpenAI response' })
            };
        }

        // Validate the response structure
        if (!wordsData.words || !Array.isArray(wordsData.words) || wordsData.words.length !== 5) {
            console.error('Invalid words data structure:', wordsData);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Invalid word data received from OpenAI' })
            };
        }

        // Validate each word object
        const validWords = wordsData.words.filter(word => 
            word && 
            typeof word === 'object' && 
            word.target && 
            word.native &&
            typeof word.target === 'string' &&
            typeof word.native === 'string' &&
            word.target.trim() !== '' &&
            word.native.trim() !== ''
        );

        if (validWords.length < 5) {
            console.error('Not enough valid words received:', validWords);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Insufficient valid words generated' })
            };
        }

        // Return the validated words
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                words: validWords.slice(0, 5) // Ensure exactly 5 words
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
