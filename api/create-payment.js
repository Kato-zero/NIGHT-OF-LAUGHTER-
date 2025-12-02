module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, provider, eventName, buyerName, receiptNum } = req.body;

  try {
    const LIPILA_BASE = process.env.LIPILA_API_BASE;
    const LIPILA_ENDPOINT = `${LIPILA_BASE}/collections/mobile-money`;
    
    // Your domain (Vercel auto-detect)
    const baseUrl = `https://${req.headers.host}`;
    
    // Convert provider
    const lipilaProvider = provider === 'mtn' ? 'MtnMoney' : 'AirtelMoney';
    
    const formattedPhone = normalizePhoneToInternational(phone);
    
    const referenceId = 'NOL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    console.log('📱 Creating Lipila payment:', {
      endpoint: LIPILA_ENDPOINT,
      amount,
      phone: formattedPhone,
      provider: lipilaProvider,
      referenceId,

      // ✅ YOUR CALLBACK URL GOES HERE
      callbackUrl: `${baseUrl}/api/lipila-callback`
    });

    // Call Lipila API
    const lipilaResponse = await fetch(LIPILA_ENDPOINT, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': process.env.LIPILA_API_KEY,

        // ✅ Callback passed in header
        'callbackUrl': `${baseUrl}/api/lipila-callback`
      },
      body: JSON.stringify({
        referenceId,
        amount: parseInt(amount),
        narration: `Night of Laughter: ${eventName}`,
        accountNumber: formattedPhone,
        currency: 'ZMW',
        email: '',
        paymentType: lipilaProvider
      })
    });

    console.log(`📊 Lipila response status: ${lipilaResponse.status}`);
    
    const responseText = await lipilaResponse.text();
    console.log(`📄 Lipila response: ${responseText}`);
    
    let lipilaData;
    try {
      lipilaData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!lipilaResponse.ok) {
      throw new Error(`Lipila API error ${lipilaResponse.status}: ${JSON.stringify(lipilaData)}`);
    }

    res.json({
      success: true,
      orderId: lipilaData.identifier || lipilaData.referenceId,
      referenceId: lipilaData.referenceId,
      status: lipilaData.status || 'Pending',
      message: lipilaData.message || 'Payment initiated successfully',
      instructions: `Check your phone for ${lipilaProvider} prompt. Enter PIN to complete.`,
      provider: lipilaProvider,
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
