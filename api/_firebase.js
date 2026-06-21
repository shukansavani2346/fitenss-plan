import admin from 'firebase-admin';

// Initialize firebase-admin
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

/**
 * Validate and verify incoming request.
 * Checks method, body size, authorization header, verifies token, and handles rate limiting.
 * @param {import('node').IncomingMessage} request 
 * @param {import('node').ServerResponse} response 
 * @param {object} options
 * @param {string} options.method - Expected HTTP method (default: 'POST')
 * @param {number} options.maxBodySizeKB - Max body size in KB (default: 50)
 * @param {number} options.rateLimitMax - Max requests per minute per user (default: 5)
 * @returns {Promise<{uid: string} | null>} returns object with uid if verified, or null (handles response in that case)
 */
export async function verifyRequest(request, response, options = {}) {
  const expectedMethod = options.method || 'POST';
  const maxBodySizeKB = options.maxBodySizeKB || 50;
  const rateLimitMax = options.rateLimitMax || 5;

  if (request.method !== expectedMethod) {
    response.status(405).json({ error: 'Method not allowed' });
    return null;
  }

  // Request body size validation
  const contentLength = request.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > maxBodySizeKB * 1024) {
    response.status(413).json({ error: `Request body exceeds ${maxBodySizeKB}KB limit.` });
    return null;
  }
  const bodyStr = request.body ? JSON.stringify(request.body) : '';
  if (bodyStr && Buffer.byteLength(bodyStr, 'utf8') > maxBodySizeKB * 1024) {
    response.status(413).json({ error: `Request body exceeds ${maxBodySizeKB}KB limit.` });
    return null;
  }

  // Firebase Auth ID token verification
  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    response.status(401).json({ error: 'Unauthorized: Token verification failed.' });
    return null;
  }

  // Rate limiting: per user per minute
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  let userRequests = rateLimitMap.get(uid) || [];
  userRequests = userRequests.filter(timestamp => timestamp > windowStart);

  if (userRequests.length >= rateLimitMax) {
    response.status(429).json({ error: `Too many requests. Limit is ${rateLimitMax} requests per minute.` });
    return null;
  }

  userRequests.push(now);
  rateLimitMap.set(uid, userRequests);

  return { uid };
}

export { admin };
