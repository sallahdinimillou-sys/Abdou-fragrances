import crypto from 'crypto';

let lastPublishTimestamp = 0;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
}

function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  if (typeof res.status === 'function') {
    try { res.status(statusCode); } catch (_) {}
  }
  if (typeof res.json === 'function') {
    return res.json(data);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publish-key, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed', message: 'Seules les requêtes POST sont autorisées.' });
  }

  const deployHookUrl = process.env.DEPLOY_HOOK_URL;
  const publishKey = process.env.PUBLISH_KEY;

  if (!deployHookUrl || !publishKey) {
    return sendJson(res, 500, {
      error: 'Configuration Missing',
      message: "Les variables d'environnement DEPLOY_HOOK_URL ou PUBLISH_KEY ne sont pas configurées dans Vercel."
    });
  }

  // Retrieve provided key from header
  const reqHeaderKey = (req.headers && (req.headers['x-publish-key'] || req.headers['authorization'])) || '';
  const cleanKey = String(reqHeaderKey).replace(/^Bearer\s+/i, '').trim();

  if (!cleanKey || !safeCompare(cleanKey, publishKey)) {
    return sendJson(res, 401, {
      error: 'Unauthorized',
      message: 'Clé de publication invalide ou manquante.'
    });
  }

  // Check 2-minute cooldown
  const now = Date.now();
  if (now - lastPublishTimestamp < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastPublishTimestamp)) / 1000);
    return sendJson(res, 429, {
      error: 'Cooldown Active',
      message: `Veuillez patienter encore ${remainingSeconds} secondes avant la prochaine publication.`,
      remainingSeconds
    });
  }

  try {
    const hookResponse = await fetch(deployHookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!hookResponse.ok) {
      const errText = await hookResponse.text().catch(() => '');
      return sendJson(res, 502, {
        error: 'Deploy Hook Error',
        message: `Erreur du hook de déploiement (${hookResponse.status}): ${errText || hookResponse.statusText}`
      });
    }

    lastPublishTimestamp = now;

    return sendJson(res, 200, {
      success: true,
      message: 'Publication lancée. Visible sur le site dans 1 à 2 minutes.',
      publishedAt: lastPublishTimestamp
    });
  } catch (err: any) {
    console.error('[publish] Deploy hook error:', err);
    return sendJson(res, 500, {
      error: 'Internal Error',
      message: `Échec lors du déclenchement du déploiement: ${err.message || err}`
    });
  }
}
