import { verifyRequest } from './_firebase.js';

export default async function handler(request, response) {
  const verified = await verifyRequest(request, response, { maxBodySizeKB: 50, rateLimitMax: 5 });
  if (!verified) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured on Vercel.' });
  }
  
  const { textVal } = request.body;
  if (!textVal) {
    return response.status(400).json({ error: 'Missing textVal in request body.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Parse this voice note into a structured JSON array of food items eaten. The voice note is: "${textVal}". Parse all items, estimate portions, and calculate calories, protein, carbs, and fats. Account for typical cooking ingredients (e.g. oils, butter, sauces, seasonings). Return JSON ONLY in this exact format: [ { "food_name": "Dish Name", "portion_est": "Portion details", "kcal": 250, "protein_g": 8, "carbs_g": 35, "fat_g": 6 } ]. Do not wrap in markdown or output any extra text.`;

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
    return response.status(200).json(data);
  } catch (error) {
    console.error("Gemini voice parse proxy error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
