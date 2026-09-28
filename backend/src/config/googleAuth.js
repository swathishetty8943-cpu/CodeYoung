const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const env = require('./env');

// Google publishes the public signing keys for Firebase ID tokens at this
// well-known JWKS endpoint - no service account or private key needed to
// fetch and use them, since it's *verifying* a signature (needs only the
// public key), not *creating* one (which would need a private key).
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const client = jwksClient({
  jwksUri: GOOGLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 6 * 60 * 60 * 1000, // 6h - roughly matches how often Google rotates these keys
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies a Firebase ID token sent by the frontend (obtained from
 * `getIdToken()` after `signInWithPopup(auth, new GoogleAuthProvider())`)
 * by checking its signature against Google's public keys directly - no
 * firebase-admin, no service account, no private key required anywhere.
 * Returns the decoded profile in the same shape the rest of the app
 * expects. Throws if the token is invalid/expired/wrong project.
 */
async function verifyGoogleToken(idToken) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not set in backend/.env (see .env.example).');
  }

  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      },
      (err, payload) => (err ? reject(err) : resolve(payload))
    );
  });

  return {
    googleId: decoded.sub,
    email: decoded.email,
    name: decoded.name || decoded.email,
    emailVerified: decoded.email_verified,
  };
}

module.exports = { verifyGoogleToken };
