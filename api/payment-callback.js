const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get payment data from Lipila
    const { orderId, status, providerReference } = req.body;
    
    console.log(`Payment callback received: ${orderId} - ${status}`);

    // 2. Update payment in Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_PAYMENTS_ID);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // 3. Find the payment by OrderID
    const paymentRow = rows.find(row => row.get('OrderID') === orderId);
    
    if (paymentRow) {
      // 4. Update status
      paymentRow.set('Status', status);
      paymentRow.set('ProviderReference', providerReference || '');
      paymentRow.set('Updated', new Date().toISOString());
      await paymentRow.save();
      
      console.log(`Payment ${orderId} updated to: ${status}`);
    } else {
      console.log(`Payment ${orderId} not found in sheets`);
    }

    // 5. Send response to Lipila
    res.json({ 
      received: true,
      message: `Payment ${orderId} status updated to ${status}`
    });

  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({ 
      error: 'Callback processing failed',
      details: error.message 
    });
  }
};
