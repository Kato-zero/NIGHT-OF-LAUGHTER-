// api/create-payment.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, provider, eventName, buyerName, receiptNum } = req.body;

  if (!amount || !phone || !eventName || !buyerName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1️⃣ Call Lipila
    const lipilaResponse = await fetch(`${process.env.LIPILA_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LIPILA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        phone: phone,
        currency: 'ZMW',
        callback_url: `${process.env.PUBLIC_BASE_URL}/api/payment-callback`
      })
    });

    const lipilaData = await lipilaResponse.json();

    // 2️⃣ Store payment in SheetDB
    const SHEETDB_URL = process.env.SHEETDB_PAYMENTS_URL; // your SheetDB payments URL

    const sheetResponse = await fetch(SHEETDB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          OrderID: lipilaData.id,
          Event: eventName,
          BuyerName: buyerName,
          Phone: phone,
          Amount: amount,
          TicketType: 'VIP single',  // optional: adjust as needed
          Status: 'pending',
          ReceiptNum: receiptNum || '',
          Provider: provider || '',
          Created: new Date().toISOString(),
          Updated: new Date().toISOString()
        }
      })
    });

    const sheetData = await sheetResponse.json();

    // 3️⃣ Respond to frontend
    res.status(200).json({
      orderId: lipilaData.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment failed to initiate' });
  }
          }
