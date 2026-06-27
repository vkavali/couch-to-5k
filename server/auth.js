/**
 * Sign in with Apple — verified on OUR server — plus our own session tokens.
 *
 * Flow:
 *  1. The iOS app authenticates with Apple natively and gets an `identityToken`
 *     (a JWT signed by Apple).
 *  2. We verify that token here against Apple's published public keys (JWKS):
 *     signature, issuer (appleid.apple.com), audience (our bundle id), expiry.
 *  3. We mint our OWN session JWT (HS256, signed with SESSION_SECRET) carrying the
 *     internal user id. The app stores it in the iOS Keychain and sends it as a
 *     Bearer token on every request. No Apple round-trip after first sign-in.
 *
 * Env:
 *  - SESSION_SECRET : long random string used to sign our session tokens (required)
 *  - APPLE_AUD      : expected audience = the app bundle id
 *                     (default com.vkavali.couchto5k). For a native iOS app this is
 *                     the bundle id; a web "Service ID" would differ.
 */
const { createRemoteJWKSet, jwtVerify, SignJWT } = require("jose");

const APPLE_ISS = "https://appleid.apple.com";
const APPLE_AUD = process.env.APPLE_AUD || "com.vkavali.couchto5k";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const SESSION_TTL = "60d";

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const secretKey = () => new TextEncoder().encode(SESSION_SECRET);

function configured() {
  return !!SESSION_SECRET;
}

// Verify Apple's identity token; return the stable subject + email if present.
async function verifyAppleToken(identityToken) {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: APPLE_ISS,
    audience: APPLE_AUD,
  });
  return { sub: payload.sub, email: payload.email || null };
}

// Mint our session token for an internal user id.
async function issueSession(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

// Express middleware: require a valid session, set req.userId.
async function requireAuth(req, res, next) {
  if (!configured()) return res.status(500).json({ error: "Auth not configured (set SESSION_SECRET)." });
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing bearer token." });
  try {
    const { payload } = await jwtVerify(token, secretKey());
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

module.exports = { configured, verifyAppleToken, issueSession, requireAuth, APPLE_AUD };
