/**
 * Garmin Health API backend — skeleton.
 *
 * What this is: the server you need so the mobile app can sync Garmin data
 * (runs, heart rate, sleep). A phone app alone CANNOT do this — Garmin requires
 * a server-side OAuth flow plus a webhook endpoint that Garmin pushes data to.
 *
 * Before this works you must:
 *   1. Apply to the Garmin Developer Program and get approved for the Health API
 *      (https://developer.garmin.com/health-api/). Approval is required and not instant.
 *   2. Receive a Consumer Key + Consumer Secret. Put them in a .env file (see .env.example).
 *   3. Register this server's callback URL in the Garmin developer portal.
 *   4. Deploy this somewhere with HTTPS (Railway, Fly, Render, etc.).
 *
 * Garmin's Health API uses OAuth 1.0a (user authorization) + ping/push webhooks.
 * The endpoints below lay out that flow; the TODOs are where Garmin's signed
 * requests go. Keep secrets server-side only — never ship them in the app.
 */

const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const {
  GARMIN_CONSUMER_KEY,
  GARMIN_CONSUMER_SECRET,
  PORT = 8080,
} = process.env;

// In production store these per-user in a database, not in memory.
const userTokens = new Map(); // userId -> { token, tokenSecret }

function requireConfig(res){
  if(!GARMIN_CONSUMER_KEY || !GARMIN_CONSUMER_SECRET){
    res.status(500).json({ error: "Set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET in .env" });
    return false;
  }
  return true;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Step 1 — start auth. The app opens this in a browser/WebView.
 * Get an unauthorized request token from Garmin, then redirect the user to
 * Garmin's authorization page.
 */
app.get("/auth/garmin/start", async (req, res) => {
  if(!requireConfig(res)) return;
  // TODO: POST to https://connectapi.garmin.com/oauth-service/oauth/request_token
  //       with an OAuth 1.0a signed header, receive oauth_token + oauth_token_secret,
  //       then redirect to:
  //       https://connect.garmin.com/oauthConfirm?oauth_token=<token>
  res.status(501).json({
    todo: "Implement OAuth 1.0a request-token call, then redirect to Garmin's oauthConfirm page.",
  });
});

/**
 * Step 2 — callback. Garmin redirects back here with oauth_verifier.
 * Exchange it for the user's access token and persist it.
 */
app.get("/auth/garmin/callback", async (req, res) => {
  if(!requireConfig(res)) return;
  const { oauth_token, oauth_verifier } = req.query;
  // TODO: POST to .../oauth/access_token with oauth_token + oauth_verifier,
  //       receive the long-lived access token + secret, then:
  //       userTokens.set(userId, { token, tokenSecret });
  res.status(501).json({ received: { oauth_token, oauth_verifier },
    todo: "Exchange verifier for access token and store per user." });
});

/**
 * Step 3 — Garmin pushes new activity/HR/sleep data here (the "push" service).
 * Configure this URL as your webhook in the Garmin portal. Verify and store.
 */
app.post("/webhooks/garmin", (req, res) => {
  // Garmin sends summaries (activities, dailies, sleeps, etc.) as JSON.
  // TODO: validate the payload, map to your schema, save to the DB,
  //       and make it available to the app via the endpoint below.
  console.log("Garmin webhook:", JSON.stringify(req.body).slice(0, 500));
  res.sendStatus(200); // must 200 quickly or Garmin retries
});

/**
 * Step 4 — the app reads a user's synced activities from your DB.
 */
app.get("/api/activities/:userId", (req, res) => {
  // TODO: return stored activities for this user.
  res.json({ userId: req.params.userId, activities: [] });
});

app.listen(PORT, () => console.log(`Garmin backend on :${PORT}`));
