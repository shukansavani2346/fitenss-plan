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
  
  const { userProfile, feedback, previousPlan, weekNumber = 1 } = request.body;
  if (!userProfile) {
    return response.status(400).json({ error: 'Missing userProfile in request body.' });
  }

  const { age, height, weight, sex, activityLevel, goal, targetOutcome, equipment, experience, splitPreference, injuries } = userProfile;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `You are an expert exercise scientist, biomechanics specialist, and elite strength coach. 
Generate a highly personalized 1-week gym workout plan for a user with the following profile:
- Age: ${age}
- Height: ${height} cm
- Weight: ${weight} kg
- Biological Sex: ${sex}
- Goal: ${goal}
- Target Outcome / What they want to achieve: ${targetOutcome || 'General Fitness'}
- Activity Level: ${activityLevel}
- Available Equipment: ${equipment || 'Full Gym'} (Options: Full Gym, Dumbbells Only, Bodyweight)
- Training Experience: ${experience || 'Intermediate'} (Options: Beginner, Intermediate, Advanced)
- Split Preference: ${splitPreference || 'PPL'} (Options: PPL, Upper/Lower, Bro Split, Full Body)
- Injuries / Limitations: ${injuries || 'None'}

Rules for injury protection:
1. If knee pain/injury/soreness is flagged, substitute squats/leg presses with knee-friendly alternatives (e.g. box squats, leg extensions, leg curls, or glute bridges) and add injury warning cues.
2. If lower back pain/injury is flagged, substitute deadlifts or heavy barbell rows with chest-supported rows, cable pull-throughs, or lat pulldowns.
3. If shoulder issues are flagged, tuck elbows in presses, avoid deep dips, and replace standard overhead presses with neutral grip shoulder dumbbell presses or lateral raises.

Progressive overload / Sunday adjustment context (if updating from previous week):
${feedback ? `This is a weekly update. User feedback on the previous week's plan:
- Joint soreness rating: ${feedback.jointSoreness}/5
- Recovery/Energy rating: ${feedback.recovery}/5
- Progressive overload status: ${feedback.overloadStatus} (progressed, stayed_same, regressed)
- Weekly workouts completed: ${feedback.completedWorkouts} sets checked off.
- Weekly diet average: ${feedback.avgCalories} kcal, ${feedback.avgProtein}g protein.

Previous Plan:
${JSON.stringify(previousPlan)}

Instructions for adjustments:
- If joint soreness is high (>= 4/5) or recovery is very low (<= 2/5), prescribe a DELOAD week or substitute exercises targeting the sore area with machine alternatives.
- If overloadStatus is "progressed", apply progressive overload for the next week (e.g. increase weight by 2.5kg, or add sets, or adjust rep ranges).
- If overloadStatus is "stayed_same", keep weights similar but challenge them to hit the upper rep limit.
- If overloadStatus is "regressed", reduce weight by 5-10% to rebuild strength or adjust target reps.` : 'This is the initial plan setup.'}

Return JSON ONLY in this exact format, with days representing mon, tue, wed, thu, fri, sat, sun. If it is a rest day, set rest: true.
{
  "plan_name": "AI Personal Trainer Split",
  "notes": "Coaching instructions for this week regarding injuries, goals, progressive overload, and form tips.",
  "week_number": ${weekNumber},
  "days": {
    "mon": {
      "title": "Push Day (Chest/Shoulders/Triceps) or Rest Day",
      "rest": false,
      "list": [
        { "name": "Flat Dumbbell Bench Press", "sets": 3, "reps": "8-12", "rir_target": 2, "cues": "Control descent, tuck elbows 45 degrees" }
      ]
    },
    "tue": {
      "title": "Pull Day or Rest Day",
      "rest": false,
      "list": [
        { "name": "Lat Pulldowns", "sets": 3, "reps": "10-12", "rir_target": 2, "cues": "Pull with elbows, squeeze shoulder blades" }
      ]
    },
    "wed": {
      "title": "Rest Day",
      "rest": true,
      "list": []
    },
    "thu": {
      "title": "Leg Day or Rest Day",
      "rest": false,
      "list": []
    },
    "fri": {
      "title": "Upper Body or Rest Day",
      "rest": false,
      "list": []
    },
    "sat": {
      "title": "Lower Body or Rest Day",
      "rest": false,
      "list": []
    },
    "sun": {
      "title": "Rest Day",
      "rest": true,
      "list": []
    }
  }
}
Do not wrap in markdown or output any extra text.`;

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
    
    // Parse to ensure valid JSON before returning
    const parsedData = JSON.parse(cleanJson);
    return response.status(200).json(parsedData);
  } catch (error) {
    console.error("Gemini workout generator proxy error:", error);
    return response.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
  }
}
