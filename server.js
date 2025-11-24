/**
 * server.js
 * Lipila MoMo (MTN & Airtel) collections integration for NIGHT-OF-LAUGHTER
 *
 * Security: put your LIPILA_API_KEY in an environment variable (do NOT commit it).
 * For local dev create a .env with LIPILA_API_KEY and LIPILA_API_BASE and PUBLIC_BASE_URL (see README).
 *
 * NOTE: Lipila API endpoint paths may differ by account/sandbox vs production.
 * Confirm the exact POST path for creating a collection and the GET path to query it.
 * The code below uses /v1/payments as a default example. Replace paths if Lipila docs indicate otherwise.
 */

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // npm i node-fetch@2
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const LIPILA_API_KEY = process.env.LIPILA_API_KEY;
const LIPILA_API_BASE = process.env.LIPILA_API_BASE || 'https://api.lipila.com'; // set via env
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`; // used for callback URL

if (!LIPILA_API_KEY) {
  console.error('Missing LIPILA_API_KEY environment variable. Set it before running.');
  process.exit(1);
}

/**
 * In-memory order store for demo. Replace with a DB in production.
 * Order shape:
 * {
 *   id,
 *   amount,
 *   phone,
 *   provider, // 'mtn'|'airtel'
 *   status, // pending/paid/failed
 *   externalRef, // our external reference (uuid)
 *   providerReference, // lipila id/reference returned by Lipila
 *   providerRaw
 * }
 */
const orders = new Map();

// Helper to call Lipila to create a collection/payment request
async function createLipilaCollection({ amount, currency = 'ZMW', phone, provider, external_reference, callback_url }) {
  // Example endpoint: POST /v1/payments  (confirm with Lipila docs; change if different)
  const url = `${LIPILA_API_BASE}/v1/payments`;

  // Body shape will depend on Lipila; this is a common aggregator shape:
  const body = {
    amount,
    currency,
    phone,
    provider, // 'mtn' or 'airtel' -- confirm exact param name with Lipila
    external_reference, // unique id you provide
    callback_url
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LIPILA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Helper to query Lipila about a payment by providerReference or our external ref
async function getLipilaPayment(providerReferenceOrId) {
  // Example GET endpoint: /v1/payments/{id}
  const url = `${LIPILA_API_BASE}/v1/payments/${encodeURIComponent(providerReferenceOrId)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${LIPILA_API_KEY}`,
      'Accept': 'application/json'
    }
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Endpoint called by the frontend to initiate a mobile money payment via Lipila
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, phone, provider, eventName, buyerName, receiptNum } = req.body;
    if (!amount || !phone || !provider) return res.status(400).json({ error: 'amount, phone and provider required' });

    const orderId = 'order_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const externalRef = uuidv4();
    const order = {
      id: orderId,
      amount,
      phone,
      provider,
      eventName: eventName || null,
      buyerName: buyerName || null,
      receiptNum: receiptNum || null,
      status: 'pending',
      externalRef,
      createdAt: new Date().toISOString()
    };
    orders.set(orderId, order);

    const callbackUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/webhook/lipila`;

    const lipilaResp = await createLipilaCollection({
      amount,
      currency: 'ZMW',
      phone,
      provider,
      external_reference: externalRef,
      callback_url: callbackUrl
    });

    if (!lipilaResp.ok) {
      order.status = 'error';
      order.providerRaw = lipilaResp.data;
      orders.set(orderId, order);
      return res.status(502).json({ error: 'lipila_error', details: lipilaResp.data });
    }

    // typical Lipila response contains a reference id or transaction id; adapt based on actual response
    const providerReference = lipilaResp.data && (lipilaResp.data.reference || lipilaResp.data.id || lipilaResp.data.transaction_id || lipilaResp.data.payment_id) || null;
    order.providerReference = providerReference;
    order.providerRaw = lipilaResp.data;
    orders.set(orderId, order);

    return res.json({ orderId, providerReference });
  } catch (err) {
    console.error('create-payment error', err);
    return res.status(500).json({ error: 'server_error', message: String(err.message) });
  }
});

// Order status endpoint for frontend polling
app.get('/order/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json(order);
});

/**
 * Webhook endpoint Lipila will call for notifications.
 * You must register this URL in Lipila dashboard (PUBLIC_BASE_URL + /webhook/lipila).
 *
 * Because aggregator webhook payloads differ, we verify by calling Lipila's GET payment API
 * using either the providerReference or our externalRef.
 */
app.post('/webhook/lipila', async (req, res) => {
  try {
    const event = req.body || {};
    // Try to locate a reference in the payload. Names vary: reference, id, payment_id, external_reference, transaction_id
    const providerRef = event.reference || event.id || event.payment_id || event.transaction_id || (event.data && (event.data.reference || event.data.id || event.data.payment_id || event.data.transaction_id));
    const externalRef = event.external_reference || (event.data && event.data.external_reference) || null;

    // Find order by providerReference or externalRef
    let order = null;
    if (providerRef) {
      order = Array.from(orders.values()).find(o => o.providerReference === providerRef);
    }
    if (!order && externalRef) {
      order = Array.from(orders.values()).find(o => o.externalRef === externalRef);
    }
    if (!order) {
      console.warn('Webhook received but order not found', { providerRef, externalRef, event });
      // Store unknown webhooks in logs for reconciliation if desired
      return res.status(404).send('order not found');
    }

    // If already processed, return ok
    if (order.status === 'paid') return res.status(200).send('already processed');

    // Verify with Lipila by querying payment status (prefer this over trusting raw webhook)
    const idToQuery = order.providerReference || order.externalRef;
    try {
      const verify = await getLipilaPayment(idToQuery);
      const p = verify.data || {};
      const status = (p.status || p.state || '').toString().toLowerCase();

      if (status.includes('success') || status.includes('paid') || status.includes('completed')) {
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        order.providerStatus = status;
        order.providerRaw = p;
        // TODO: deliver ticket (email, SMS), persist to DB, create settlement record
      } else if (status.includes('fail') || status.includes('rejected') || status.includes('cancel')) {
        order.status = 'failed';
        order.failedAt = new Date().toISOString();
        order.providerStatus = status;
        order.providerRaw = p;
      } else {
        // pending or unknown
        order.status = status || 'pending';
        order.providerRaw = p;
      }
      orders.set(order.id, order);
      return res.status(200).send('ok');
    } catch (err) {
      console.error('verification query failed', err);
      // respond 500 so the provider may retry (or 200 to not cause retries depending on Lipila behavior)
      return res.status(500).send('verification_failed');
    }
  } catch (err) {
    console.error('webhook error', err);
    return res.status(500).send('server_error');
  }
});

app.listen(PORT, () => {
  console.log(`Lipila payment server listening on port ${PORT}`);
  console.log(`PUBLIC_BASE_URL=${PUBLIC_BASE_URL}`);
  console.log('Make sure your webhook URL is set in Lipila dashboard: ' + `${PUBLIC_BASE_URL.replace(/\/$/, '')}/webhook/lipila`);
});