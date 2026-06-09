import { Router } from 'express';
import { translateText } from '../../utils/translate.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { text, source = 'auto', target } = req.body ?? {};
    const translatedText = await translateText({ text, source, target });
    res.json({ translatedText });
  } catch (err) {
    const status = err?.status ?? 502;
    res.status(status).json({
      error: err?.message ?? 'Translation failed',
      translatedText: String(req.body?.text ?? ''),
    });
  }
});

export default router;
