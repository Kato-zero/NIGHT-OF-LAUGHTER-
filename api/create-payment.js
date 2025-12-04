const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, eventName, buyerName, receiptNum } = req.body;

  try {
    const formattedPhone = normalizePhoneToInternational(phone);
    const referenceId = 'NOL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const MUNI_ENDPOINT = 'https://api.moneyunify.one/payments/request';
    const AUTH_ID = process.env.MONEYUNIFY_AUTH_ID; // Set this in your environment

    console.log('📱 Creating MoneyUnify payment:', {
      endpoint: MUNI_ENDPOINT,
      amount,
      phone: formattedPhone,
      referenceId
    });

    const muniResponse = await fetch(MUNI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        from_payer: formattedPhone,
        amount: amount.toString(),
        auth_id: AUTH_ID
      })
    });

    const muniData = await muniResponse.json();

    console.log(`📊 MoneyUnify response status: ${muniResponse.status}`);
    console.log(`📄 MoneyUnify response:`, muniData);

    if (!muniResponse.ok || !muniData.success) {
      throw new Error(`MoneyUnify API error: ${muniData.message || 'Unknown error'}`);
    }

    res.json({
      success: true,
      orderId: muniData.identifier || referenceId,
      referenceId,
      status: muniData.status || 'Pending',
      message: muniData.message || 'Payment initiated successfully',
      instructions: `Check your phone for payment prompt. Enter PIN to complete.`,
      provider: 'MoneyUnify',
      amount,
      phone: formattedPhone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Payment processing error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      fallbackInstructions: `Send K${amount} to 0973 299 759 (Ref: ${receiptNum})`,
      whatsappLink: `https://wa.me/260973299759?text=${encodeURIComponent(
        `Payment: ${eventName}\nName: ${buyerName}\nRef: ${receiptNum}\nAmount: K${amount}`
      )}`
    });
  }
};

function normalizePhoneToInternational(phone) {
  let s = phone.toString().trim();
  s = s.replace(/[\s\-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);

  if (/^0\d{9}$/.test(s)) return '260' + s.slice(1);
  if (/^260\d{9}$/.test(s)) return s;
  if (/^9\d{8}$/.test(s)) return '260' + s;

  return s;
}
