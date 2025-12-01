const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, provider, eventName, buyerName, receiptNum } = req.body;

  try {
    // 1. Call Lipila
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

    // 2. Store in Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_PAYMENTS_ID);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    await sheet.addRow({
      'OrderID': lipilaData.id,
      'Event': eventName,
      'BuyerName': buyerName,
      'Phone': phone,
      'Amount': amount,
      'TicketType': 'VIP single',
      'Status': 'pending',
      'ReceiptNum': receiptNum,
      'Provider': provider,
      'Created': new Date().toISOString(),
      'Updated': new Date().toISOString()
    });

    res.json({
      orderId: lipilaData.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment failed to initiate' });
  }
};