const { GoogleSpreadsheet } = require('google-spreadsheet');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_EVENTS_ID);
    
    // FIX: Handle the \n issue
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    // If \n is missing, add them back
    if (privateKey && !privateKey.includes('\\n')) {
      // Replace actual newlines with \n
      privateKey = privateKey.replace(/\n/g, '\\n');
    }
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: privateKey.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const events = rows
      .filter(row => row.get('Status') === 'active')
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
    
    res.json(events);
    
  } catch (error) {
    console.error('Google Sheets error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: error.message,
      hint: 'Check private key formatting. Ensure \\n are preserved.'
    });
  }
};
