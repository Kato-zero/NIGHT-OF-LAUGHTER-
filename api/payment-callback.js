module.exports = async (req, res) => {
  console.log('📞 Lipila callback received:', {
    method: req.method,
    body: req.body,
    headers: req.headers
  });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const lipilaData = req.body;
    
    console.log('💰 Payment callback data:', {
      referenceId: lipilaData.referenceId,
      identifier: lipilaData.identifier,
      status: lipilaData.status,
      message: lipilaData.message,
      amount: lipilaData.amount,
      accountNumber: lipilaData.accountNumber
    });
    
    // TODO: Update your database/Google Sheets here
    // You could:
    // 1. Update payment status in Google Sheets
    // 2. Send email/SMS with ticket
    // 3. Trigger ticket generation
    
    if (lipilaData.status === 'Pending') {
      console.log(`⏳ Payment ${lipilaData.referenceId} is pending`);
    } 
    else if (lipilaData.status === 'Success' || lipilaData.status === 'Paid') {
      console.log(`✅ Payment ${lipilaData.referenceId} successful!`);
      // Generate and send ticket here
    }
    else if (lipilaData.status === 'Failed') {
      console.log(`❌ Payment ${lipilaData.referenceId} failed: ${lipilaData.message}`);
    }
    
    // Always return 200 to Lipila
    res.status(200).json({ 
      received: true,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
};
