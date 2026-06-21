import { verifyRequest } from './_firebase.js';

export default async function handler(request, response) {
  const verified = await verifyRequest(request, response, { maxBodySizeKB: 50, rateLimitMax: 5 });
  if (!verified) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
  }

  const { userProfile } = request.body;
  if (!userProfile) {
    return response.status(400).json({ error: 'Missing userProfile in request body.' });
  }

  const skinType = userProfile.skinType || 'combination';
  const concerns = userProfile.skinConcerns || 'none';
  const sunExposure = userProfile.sunExposure || 'moderate';
  const skinAllergies = userProfile.skinAllergies || 'none';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a certified dermatologist and skincare formulator.
Design a personalized morning (AM) and night (PM) skincare routine for a user with the following skin profile:
- Skin Type: ${skinType}
- Primary Concern: ${concerns}
- Daily Sun Exposure: ${sunExposure}
- Skincare Allergies / Excluded Ingredients: ${skinAllergies}

Guidelines:
1. Protect the skin barrier first. Do not over-exfoliate.
2. In the morning routine, always include sunscreen (SPF 30 or 50) if sun exposure is moderate or high, with specific application tips.
3. Address the primary concern (${concerns}) with safe, evidence-based active ingredients (e.g. Salicylic acid for acne, Niacinamide or Vitamin C for dullness/pigmentation) unless user is allergic to them.
4. Avoid any ingredients that the user is allergic to (${skinAllergies}).
5. Keep steps simple (3 to 6 steps per routine).

Return JSON ONLY in this exact format. Do not wrap in markdown or output any extra text.
{
  "morning": [
    {
      "title": "Gentle Cleanser",
      "desc": "Wash with lukewarm water and a soap-free gentle cleanser to remove overnight sebum."
    }
  ],
  "night": [
    {
      "title": "Double Cleanse",
      "desc": "Use an oil-based cleanser followed by your gentle water-based cleanser to remove sunscreen, dirt, and pollution."
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
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(cleanJson);
    return response.status(200).json(parsedData);
  } catch (error) {
    console.error("Gemini skincare routine generator error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
