const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-1.5-flash';

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(p => p?.text ?? '').join('').trim();
}

async function callGemini({ system, user, model, max_tokens, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY not configured');
    err.status = 503;
    throw err;
  }

  const resp = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens: max_tokens },
    }),
  });

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(body?.error?.message || `Gemini error (${resp.status})`);
    err.status = resp.status;
    err.body = body;
    throw err;
  }
  return extractText(body);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function geminiChat({ system, user, model = DEFAULT_MODEL, max_tokens = 500, temperature = 0.2 }) {
  const retryable = s => s === 503 || s === 529 || s === 500;

  // Try primary model up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callGemini({ system, user, model, max_tokens, temperature });
    } catch (err) {
      if (!retryable(err.status) || attempt === 1) {
        // On second failure of primary, try fallback model once
        if (retryable(err.status) && model !== FALLBACK_MODEL) break;
        throw err;
      }
      await sleep(1500);
    }
  }

  // Fallback to gemini-1.5-flash
  try {
    return await callGemini({ system, user, model: FALLBACK_MODEL, max_tokens, temperature });
  } catch (err) {
    const friendly = new Error('Model şu anda meşgul, lütfen biraz bekleyip tekrar deneyin.');
    friendly.status = 503;
    throw friendly;
  }
}
