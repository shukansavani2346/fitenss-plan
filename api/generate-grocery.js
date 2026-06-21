import { verifyRequest } from './_firebase.js';

export default async function handler(request, response) {
  const verified = await verifyRequest(request, response, { maxBodySizeKB: 50, rateLimitMax: 5 });
  if (!verified) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
  }

  const { userProfile, budget, familySize } = request.body;
  if (!userProfile) {
    return response.status(400).json({ error: 'Missing userProfile in request body.' });
  }

  const dietType = userProfile.dietType || 'Any';
  const allergies = userProfile.allergies || 'None';
  const goal = userProfile.goal || 'maintain';
  const targetOutcome = userProfile.targetOutcome || 'General Fitness';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a professional nutrition planner and budget coordinator. 
Generate a weekly grocery shopping list for a household with the following profile:
- Weekly Budget: ₹${budget} INR
- Household/Family Size: ${familySize} person(s)
- Primary Diet Preference: ${dietType}
- Food Allergies/Exclusions: ${allergies}
- Core Fitness Goal: ${goal} (${targetOutcome})

Requirements:
1. Provide food items that support their fitness goal (e.g. higher protein items for muscle building/fat loss, whole grains, vegetables, healthy fats).
2. The total cost of all items in the grocery list MUST NOT exceed the weekly budget of ₹${budget} INR.
3. The quantities ('qty') must be appropriate for a family size of ${familySize} for one week.
4. Avoid any ingredients that trigger the user's allergies (${allergies}).
5. Group items logically into categories (e.g., "Proteins & Dairy", "Vegetables & Fruits", "Grains & Pantry", "Snacks & Condiments").
6. Categorize items into subgroups using the 'sec' field (e.g., "Dairy", "Poultry", "Fresh Fruits", "Leafy Greens").

Return JSON ONLY in this exact schema format. Do not wrap in markdown or output any extra text.
{
  "categories": [
    {
      "title": "Proteins & Dairy",
      "icon": "ti-egg",
      "badge": "High Protein",
      "badgeType": "primary",
      "note": "Optional category summary or nutritional suggestion",
      "items": [
        {
          "id": "p1",
          "name": "Organic Whole Eggs",
          "qty": "2 dozen",
          "cost": 160,
          "sec": "Dairy & Eggs"
        }
      ]
    }
  ]
}

Ensure every item in 'items' has a unique, short string 'id' (e.g. p1, p2, v1, v2). All costs must be integers representing Indian Rupees (INR).`;

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
    console.error("Gemini grocery list generator error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
