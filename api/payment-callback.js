module.exports = async (req, res) => {
  console.log('📞 Lipila callback received:', {
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  // 🎯 Allow GET for debugging (browsers calling this URL)
  if (req.method === 'GET') {
    return res.status(200).send("Callback endpoint is live (GET received). Waiting for POST from Lipila.");
  }

  // 🔒 Only POST should be processed as real payment callback
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const lipilaData = req.body || {};

    console.log('💰 Payment callback data:', {
      referenceId: lipilaData.referenceId,
      identifier: lipilaData.identifier,
      status: lipilaData.status,
      message: lipilaData.message,
      amount: lipilaData.amount,
      accountNumber: lipilaData.accountNumber
    });

    //----------------------------
    // 🔄 PAYMENT LOGIC HERE
    //----------------------------

    if (lipilaData.status === 'Pending') {
      console.log(`⏳ Payment ${lipilaData.referenceId} is pending`);
    } 
    else if (lipilaData.status === 'Success' || lipilaData.status === 'Paid') {
      console.log(`✅ Payment ${lipilaData.referenceId} successful!`);
      // TODO: Send SMS/email/ticket
    }
    else if (lipilaData.status === 'Failed') {
      console.log(`❌ Payment ${lipilaData.referenceId} failed: ${lipilaData.message}`);
    }

    //----------------------------
    // ✔ Always respond 200
    //----------------------------

    return res.status(200).json({
      received: true,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Callback error:', error);
    return res.status(500).json({ error: 'Callback processing failed' });
  }
};
