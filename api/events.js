const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  // Enable CORS (allow frontend to call this API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Connect to Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_EVENTS_ID);
    
    // 2. Authenticate with service account
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    // 3. Load document info
    await doc.loadInfo();
    
    // 4. Get first sheet
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // 5. Process rows into events
    const events = rows
      .filter(row => row.get('Status') && row.get('Status').toLowerCase() === 'active')
      .map(row => ({
        name: row.get('Name') || '',
        date: row.get('Date') || 'TBA',
        time: row.get('Time') || 'TBA',
        venue: row.get('Venue') || 'TBA',
        image: row.get('Image') || 'https://via.placeholder.com/400x400',
        type: row.get('Type') || 'upcoming',
        vip_single: parseInt(row.get('VIP Single')) || 0,
        vip_double: parseInt(row.get('VIP Double')) || 0,
        ordinary_single: parseInt(row.get('Ordinary Single')) || 0,
        ordinary_double: parseInt(row.get('Ordinary Double')) || 0,
        desc: row.get('Description') || ''
      }));
    
    // 6. Send events as JSON
    res.json(events);
    
  } catch (error) {
    console.error('Google Sheets error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: error.message 
    });
  }
};
