// api/events.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://sheetdb.io/api/v1/owneanfeuzae9");
    const data = await response.json();
    res.status(200).json({ success: true, events: data });
  } catch (error) {
    console.error("Events API error:", error);
    res.status(500).json({ success: false, error: "Failed to load events" });
  }
}
