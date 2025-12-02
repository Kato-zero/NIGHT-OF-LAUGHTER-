const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get data from frontend
    const { amount, phone, provider, eventName, buyerName, receiptNum } = req.body;
    
    // 2. Get current domain (for callback URL)
    const baseUrl = req.headers.origin || `https://${req.headers.host}`;
    
    // 3. Call Lipila API to create payment
    const lipilaResponse = await fetch('https://lipila-uat.hobbiton.app/transactions/mobile-money', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LIPILA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseInt(amount),
        phone: phone,
        currency: 'ZMW',
        callback_url: `${baseUrl}/api/payment-callback`
      })
    });

    // 4. Check if Lipila request succeeded
    if (!lipilaResponse.ok) {
      const errorText = await lipilaResponse.text();
      throw new Error(`Lipila API error: ${lipilaResponse.status} - ${errorText}`);
    }

    const lipilaData = await lipilaResponse.json();

    // 5. Store payment record in Google Sheets
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
      'TicketType': 'VIP single', // Will be updated based on selection
      'Status': 'pending',
      'ReceiptNum': receiptNum,
      'Provider': provider,
      'Created': new Date().toISOString(),
      'Updated': new Date().toISOString()
    });

    // 6. Return success to frontend
    res.json({
      orderId: lipilaData.id,
      status: 'pending',
      message: 'Payment initiated successfully'
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ 
      error: 'Payment failed to initiate',
      details: error.message 
    });
  }
};
