// Simple LLM provider supporting multiple endpoints (LM Studio, Cloudflare + Ollama)
require('dotenv').config();

async function callLLM(systemPrompt, userPrompt, provider = 'local') {
  // Select configuration based on the requested provider
  const isRemote = provider === 'remote';
  const apiBase = isRemote 
    ? (process.env.REMOTE_LLM_API_BASE || 'https://your-tunnel.trycloudflare.com/v1')
    : (process.env.LOCAL_LLM_API_BASE || 'http://localhost:1234/v1');
    
  const apiKey = isRemote 
    ? (process.env.REMOTE_OPENAI_API_KEY || 'ollama')
    : (process.env.LOCAL_OPENAI_API_KEY || 'lm-studio');
    
  const model = isRemote 
    ? (process.env.REMOTE_LLM_MODEL || 'llama3')
    : (process.env.LOCAL_LLM_MODEL || 'local-model');

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM Error [${provider}]: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error(`LLM Provider (${provider}) failed:`, error);
    return null;
  }
}

module.exports = { callLLM };
