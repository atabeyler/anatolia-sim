const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

function extractText(data) {
  const msg = data?.choices?.[0]?.message?.content;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.map(p => (typeof p === 'string' ? p : (p?.text ?? ''))).join('');
  return '';
}

export async function openrouterChat({ system, user, model = DEFAULT_MODEL, max_tokens = 500, temperature = 0.2 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY not configured');
    err.status = 503;
    throw err;
  }

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://anatolia-sim.local',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'ANATOLIA-SIM',
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body?.error?.message || `OpenRouter error (${resp.status})`);
    err.status = resp.status;
    err.body = body;
    throw err;
  }
  return extractText(body);
}

