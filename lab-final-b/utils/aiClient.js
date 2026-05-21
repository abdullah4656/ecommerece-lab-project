const https = require('https');

function callOpenAI(messages, options = {}) {
  const maxTokens = options.maxTokens || 500;

  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) {
      return reject(new Error('API key is not configured. Set OPENAI_API_KEY or GROK_API_KEY.'));
    }

    const useGrok = Boolean(process.env.GROK_API_KEY);
    const rawUrl = useGrok ? process.env.GROK_API_URL : process.env.OPENAI_API_URL;
    const defaultBase = useGrok ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com';
    const base = (rawUrl || defaultBase).trim().replace(/\/+$/g, '');
    let endpoint;
    if (/chat\/completions/.test(base)) {
      endpoint = base;
    } else if (/\/v1$/i.test(base)) {
      endpoint = `${base}/chat/completions`;
    } else {
      endpoint = `${base}/v1/chat/completions`;
    }
    const defaultGrokModel = /groq\.com/i.test(endpoint)
      ? 'llama-3.3-70b-versatile'
      : 'grok-2-latest';
    const model = useGrok
      ? process.env.GROK_MODEL || defaultGrokModel
      : process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    const payload = JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages || '') }]
    });

    const req = https.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const body = JSON.parse(data);
            const choice = body.choices && body.choices[0];
            const content =
              choice?.message?.content ||
              choice?.text ||
              body.output_text ||
              '';
            return resolve(String(content || '').trim());
          } catch (err) {
            return reject(err);
          }
        }
        return reject(new Error(`AI request failed: ${res.statusCode} ${data}`));
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { callOpenAI };
