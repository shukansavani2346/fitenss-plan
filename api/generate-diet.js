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
