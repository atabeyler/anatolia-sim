const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(p => p?.text ?? '').join('').trim();
}

export async function geminiChat({ system, user, model = DEFAULT_MODEL, max_tokens = 500, temperature = 0.2 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY not configured');
    err.status = 503;
    throw err;
  }

  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  const delays = [1000, 2000, 4000];

  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const resp = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens,
        },
      }),
    });

    const body = await resp.json().catch(() => ({}));
    if (resp.ok) return extractText(body);

    const err = new Error(body?.error?.message || `Gemini error (${resp.status})`);
    err.status = resp.status;
    err.body = body;
    lastErr = err;

    if (!RETRYABLE.has(resp.status) || attempt === delays.length) break;
    await new Promise(r => setTimeout(r, delays[attempt]));
  }

  throw lastErr;
}
