// api/events.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // optional for frontend

  try {
    const response = await fetch("https://sheetdb.io/api/v1/owneanfeuzae9"); // replace with your SheetDB URL
    const data = await response.json();

    // Optional: filter or map like your original function
    const events = data
      .filter(row => row.Status === 'active')
      .map((row, index) => ({
        id: index + 1,
        name: row.Name || '',
        date: row.Date || 'TBA',
        time: row.Time || 'TBA',
        venue: row.Venue || 'TBA',
        image: row.Image || 'https://via.placeholder.com/400x400',
        type: row.Type || 'upcoming',
        vip_single: parseInt(row['VIP Single']) || 0,
        vip_double: parseInt(row['VIP Double']) || 0,
        ordinary_single: parseInt(row['Ordinary Single']) || 0,
        ordinary_double: parseInt(row['Ordinary Double']) || 0,
        desc: row.Description || ''
      }));

    res.status(200).json(events);

  } catch (error) {
    console.error('SheetDB error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
        }
