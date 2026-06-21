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
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
  }
  
  const { userProfile } = request.body;
  if (!userProfile) {
    return response.status(400).json({ error: 'Missing userProfile in request body.' });
  }

  const { age, height, weight, targetWeight, sex, activityLevel, goal, targetOutcome, allergies, dietType, mealsPerDay } = userProfile;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `You are an expert sports nutritionist and registered dietitian.
Generate a highly personalized 1-day meal plan template for a user with the following profile:
- Age: ${age}
- Height: ${height} cm
- Weight: ${weight} kg
- Target Weight: ${targetWeight || 'N/A'} kg
- Biological Sex: ${sex}
- Goal: ${goal}
- Target Outcome / What they want to achieve: ${targetOutcome || 'General Health'}
- Activity Level: ${activityLevel}
- Dietary Preference: ${dietType || 'Any'}
- Allergies / Exclusions: ${allergies || 'None'}
- Preferred Meals Per Day: ${mealsPerDay || 3}

First, calculate their approximate TDEE (Total Daily Energy Expenditure) based on their profile, then apply a caloric deficit or surplus based on their goal (cut, bulk, maintain).
Then, distribute these calories into the preferred number of meals.
Ensure the macronutrient breakdown aligns with their fitness goals (e.g., high protein for muscle building, moderate carbs, healthy fats).

Return JSON ONLY in this exact format. Do not wrap in markdown or output any extra text.
{
  "summary": {
    "target_kcal": 2500,
    "target_protein": 180,
    "target_carbs": 250,
    "target_fats": 80,
    "target_fiber": 35,
    "target_sodium": 2300,
    "water_liters": 3.5,
    "notes": "Brief explanation of the dietary strategy."
  },
  "meals": [
    {
      "name": "Breakfast",
      "items": [
        { "name": "Oatmeal", "amount": "100g", "kcal": 389, "protein": 16, "carbs": 66, "fats": 7, "fiber": 10, "sodium": 2 }
      ]
    }
  ]
}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [ { text: prompt } ] }
        ]
      })
    });
    
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return response.status(geminiRes.status).json({ error: `Gemini API returned error: ${errorText}` });
    }
    
    const data = await geminiRes.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    
    const parsedData = JSON.parse(cleanJson);
    return response.status(200).json(parsedData);
  } catch (error) {
    console.error("Gemini diet generator proxy error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
