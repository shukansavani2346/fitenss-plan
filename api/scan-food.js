import admin from 'firebase-admin';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'fitness-plan-f7cb8';

  if (privateKey && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      })
    });
  } else {
    try {
      admin.initializeApp({
        projectId
      });
    } catch (e) {
      console.warn("Failed to initialize firebase-admin with projectId, trying default:", e);
      admin.initializeApp();
    }
  }
}

// In-memory rate limiting map (resets on cold starts)
const rateLimitMap = new Map();

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Request body size validation (max 50KB)
  const contentLength = request.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > 50 * 1024) {
    return response.status(413).json({ error: 'Request body exceeds 50KB limit.' });
  }
  const bodyStr = request.body ? JSON.stringify(request.body) : '';
  if (bodyStr && Buffer.byteLength(bodyStr, 'utf8') > 50 * 1024) {
    return response.status(413).json({ error: 'Request body exceeds 50KB limit.' });
  }

  // Firebase Auth ID token verification
  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return response.status(401).json({ error: 'Unauthorized: Token verification failed.' });
  }

  // Rate limiting: max 5 requests per minute per user
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  let userRequests = rateLimitMap.get(uid) || [];
  userRequests = userRequests.filter(timestamp => timestamp > windowStart);

  if (userRequests.length >= 5) {
    return response.status(429).json({ error: 'Too many requests. Limit is 5 requests per minute.' });
  }

  userRequests.push(now);
  rateLimitMap.set(uid, userRequests);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured on Vercel.' });
  }
  
  const { base64Data, mimeType } = request.body;
  if (!base64Data || !mimeType) {
    return response.status(400).json({ error: 'Missing base64Data or mimeType in request body.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Identify the food items in this image. They are Indian foods. Estimate the portion size relative to standard Indian serving vessels (e.g., 1 katori dal, 2 rotis, 1 plate poha, etc.). Calculate total calories, protein (g), carbs (g), and fats (g). Note if it is a cooked dish, and apply raw-to-cooked conversion factors internally where appropriate to give accurate macro values. Return JSON ONLY in this exact format: { "food_name": "Dish Name", "portion_est": "Portion Details", "kcal": 450, "protein_g": 15, "carbs_g": 60, "fat_g": 12, "reasoning": "Brief explanation of Tadka/oil/portion size estimation" }. Do not wrap in markdown or output any extra text.`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });
    
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return response.status(geminiRes.status).json({ error: `Gemini API returned error: ${errorText}` });
    }
    
    const data = await geminiRes.json();
    return response.status(200).json(data);
  } catch (error) {
    console.error("Gemini food scan proxy error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
