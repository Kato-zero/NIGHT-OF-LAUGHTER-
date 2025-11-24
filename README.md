```markdown
# Lipila MoMo Integration (MTN & Airtel) — NIGHT OF LAUGHTER

What I added
- Updated index.html: UI includes "Pay with MTN" and "Pay with Airtel" buttons; client code calls your server to create payments and polls order status.
- server.js: Node + Express server that:
  - Creates Lipila collection/payment requests (POST to Lipila).
  - Receives Lipila webhooks at /webhook/lipila and verifies by querying Lipila.
  - Exposes GET /order/:id used by the frontend to poll order/payment status.

Security note — rotate your key now
- You previously posted an API key. That key must be revoked/regenerated immediately in the Lipila dashboard. Treat any posted key as compromised.
- Use the new key only on the server as an environment variable LIPILA_API_KEY. Never put the key in index.html or commit it to GitHub.

Env variables (required)
- LIPILA_API_KEY           => your Lipila API key (server-only)
- LIPILA_API_BASE          => Lipila API base URL (sandbox or production). Default in code is https://api.lipila.com (change if Lipila uses a different sandbox host).
- PUBLIC_BASE_URL          => public URL for your server (used when creating callback_url). Example: https://yourdomain.com or http://localhost:3000 for local testing.
- PORT                    => optional, default 3000

Local dev steps
1. Revoke/regenerate the old Lipila key in the Lipila dashboard.
2. Clone your repo and save the files from this reply (overwrite index.html and add server.js).
3. Install dependencies:
   - npm init -y
   - npm install express body-parser node-fetch@2 uuid dotenv
4. Create a .env file in the project root (for local dev only):
   LIPILA_API_KEY=sk_live_...
   LIPILA_API_BASE=https://api.lipila.com
   PUBLIC_BASE_URL=http://localhost:3000
5. Run locally:
   - node server.js
6. Use ngrok (or similar) to expose your local server so Lipila can call webhooks:
   - ngrok http 3000
   - copy the ngrok forwarding URL and set PUBLIC_BASE_URL to that value (or update Lipila callback URL)
7. In Lipila dashboard:
   - Register your webhook callback URL: <PUBLIC_BASE_URL>/webhook/lipila
   - Use the sandbox key and test phone numbers (Lipila docs will have sandbox test values).
8. Open your site (http://localhost:3000 or ngrok URL). Purchase a ticket and click Pay with MTN or Pay with Airtel. The frontend will POST /create-payment which calls Lipila. Polling will pick up the webhook/verification and generate the ticket.

Testing checklist
- Test a successful payment (sandbox test phone).
- Test a rejected/canceled transaction.
- Test webhook retries and duplicate notifications (server should be idempotent in production).
- Verify frontend phone normalization works for the formats your customers use.
- Confirm Lipila returns a providerReference and that the webhook contains either that reference or the external_reference.

Production checklist
- Replace in-memory orders Map with a persistent DB and mark providerReference as unique.
- Use HTTPS and enforce HSTS.
- Store LIPILA_API_KEY only in environment variables / secret manager.
- Implement webhook signature verification if Lipila provides a signature or HMAC header (check Lipila docs and add verification code).
- Implement retries/backoff for Lipila API calls.
- Add logging, monitoring, and daily reconciliation between Lipila settlement reports and your DB.
- Limit webhook endpoint to the IPs or origins Lipila uses if Lipila publishes them (optional).
- Rotate API keys periodically.

If anything here needs to be adjusted to match Lipila's exact request/response shapes (I used /v1/payments as a typical aggregator path), paste the Lipila docs link or the sample request/response from your Lipila sandbox and I'll update server.js to match exactly (no keys required).
```
