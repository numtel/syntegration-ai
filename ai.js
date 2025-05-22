export async function request(prompt, maxOutputTokens) {
  await delay(300);
  return groqRequest(prompt, maxOutputTokens);
  return geminiRequest(prompt, maxOutputTokens);
  return openaiRequest(prompt, maxOutputTokens);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geminiRequest(prompt, maxOutputTokens) {
  const body = JSON.stringify({
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {
      maxOutputTokens,
    },
  });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body,
  });
  const value = await res.json();
  const out = value.candidates[0].content.parts[0].text;
  return out;
}

async function openaiRequest(prompt, maxOutputTokens) {
  let value, out;
  try {
    const body = JSON.stringify({
      "model": "gpt-4.1-nano",
      "input": [
        {
          "role": "system",
          "content": [
            {
              "type": "input_text",
              "text": prompt,
            }
          ]
        },
      ],
      "text": {
        "format": {
          "type": "text"
        }
      },
      "reasoning": {},
      "tools": [],
      "temperature": 1,
      "max_output_tokens": maxOutputTokens,
      "top_p": 1,
      "store": true
    });
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body,
    });
    value = await res.json();
    out = value.output[0].content[0].text
  } catch(error) {
    console.log(value);
    throw error;
  }
  return out;
}

async function groqRequest(prompt, maxOutputTokens) {
  let value, out;
  try {
    const body = JSON.stringify({
      "model": "llama-3.3-70b-versatile",
      "messages": [{
        "role": "user",
        "content": prompt,
      }],
      "max_completion_tokens": maxOutputTokens,
    });
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body,
    });
    value = await res.json();
    out = value.choices[0].message.content
  } catch(error) {
    console.log(value);
    throw error;
  }
  return out;
}
