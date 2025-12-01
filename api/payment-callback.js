const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, status, providerReference } = req.body;

  try {
    // Update Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_PAYMENTS_ID);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // Find the payment row
    const paymentRow = rows.find(row => row.get('OrderID') === orderId);
    
    if (paymentRow) {
      paymentRow.set('Status', status);
      paymentRow.set('ProviderReference', providerReference || '');
      paymentRow.set('Updated', new Date().toISOString());
      await paymentRow.save();
    }

    console.log(`Payment ${orderId} updated to: ${status}`);
    res.json({ received: true });

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
};
