module.exports = async (req, res) => {
  console.log("📞 Lipila Callback Received:", req.method, req.body);
  res.status(200).json({ ok: true });
};
