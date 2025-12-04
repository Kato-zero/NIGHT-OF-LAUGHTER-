const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Missing transactionId in request body' });
  }

  try {
    const VERIFY_ENDPOINT = 'https://api.moneyunify.one/payments/verify';
    const AUTH_ID = process.env.MONEYUNIFY_AUTH_ID;

    const verifyResponse = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        transaction_id: transactionId,
        auth_id: AUTH_ID
      })
    });

    const verifyData = await verifyResponse.json();

    console.log(`🔍 Verification response:`, verifyData);

    if (!verifyResponse.ok || verifyData.isError) {
      throw new Error(verifyData.message || 'Verification failed');
    }

    res.json({
      success: true,
      transactionId: verifyData.data.transaction_id,
      status: verifyData.data.status,
      amount: verifyData.data.amount,
      charges: verifyData.data.charges,
      phone: verifyData.data.from_payer,
      message: verifyData.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Verification error:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
