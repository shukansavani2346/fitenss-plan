import { verifyRequest } from './_firebase.js';

export default async function handler(request, response) {
  const verified = await verifyRequest(request, response, { maxBodySizeKB: 4608, rateLimitMax: 5 });
  if (!verified) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured on Vercel.' });
  }
  
  const { base64Data, mimeType } = request.body;
  if (!base64Data || !mimeType) {
    return response.status(400).json({ error: 'Missing base64Data or mimeType in request body.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Identify the food items in this image. Estimate the portion size relative to standard serving sizes (e.g., grams, ounces, pieces, cups). Calculate total calories, protein (g), carbs (g), and fats (g). Note if it is a cooked dish, and apply raw-to-cooked conversion factors internally where appropriate to give accurate macro values. Return JSON ONLY in this exact format: { "food_name": "Dish Name", "portion_est": "Portion Details", "kcal": 450, "protein_g": 15, "carbs_g": 60, "fat_g": 12, "reasoning": "Brief explanation of ingredients, preparation style, and portion size estimation" }. Do not wrap in markdown or output any extra text.`;

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
