module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Direct public Google Sheets API
    const response = await fetch(
      'https://docs.google.com/spreadsheets/d/1NHbVsoRWNzcns8LZSIDF0LCTRfKae4loel0hoJEW79Q/gviz/tq?tqx=out:json'
    );
    
    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    
    const events = json.table.rows.map(row => {
      const cells = row.c;
      return {
        name: cells[0]?.v || '',
        date: cells[1]?.v || 'TBA',
        time: cells[2]?.v || 'TBA',
        venue: cells[3]?.v || 'TBA',
        image: cells[4]?.v || 'https://via.placeholder.com/400x400',
        type: cells[5]?.v || 'upcoming',
        vip_single: parseInt(cells[6]?.v) || 0,
        vip_double: parseInt(cells[7]?.v) || 0,
        ordinary_single: parseInt(cells[8]?.v) || 0,
        ordinary_double: parseInt(cells[9]?.v) || 0,
        desc: cells[10]?.v || '',
        status: cells[11]?.v || 'active'
      };
    }).filter(event => event.status.toLowerCase() === 'active');
    
    res.json(events);
    
  } catch (error) {
    console.error('Google Sheets error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};
