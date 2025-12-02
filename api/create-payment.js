export async function POST(req) {
  try {
    const body = await req.json();

    // --- REQUIRED FIELDS ---
    const apiKey = process.env.LIPILA_SECRET_KEY;
    if (!apiKey) {
      console.error("❌ Missing LIPILA_SECRET_KEY");
      return Response.json({ error: "Server missing API key" }, { status: 500 });
    }

    if (!body.phone || !body.amount || !body.provider) {
      return Response.json(
        { error: "Missing required fields: phone, amount, provider" },
        { status: 400 }
      );
    }

    // Normalize phone: remove "+" and spaces
    const phone = body.phone.replace(/\D/g, ""); // keep digits only

    // --- BUILD PAYLOAD FOR LIPILA ---
    const payload = {
      currency: "ZMW",
      amount: Number(body.amount),
      accountNumber: phone,
      fullName: body.buyerName || "Unknown Buyer",
      phoneNumber: phone,
      email: body.email || "no-email@payment.app",
      externalId: body.receiptNum || `order-${Date.now()}`,
      narration: `Payment for ${body.eventName || "Event"}`,
      provider: body.provider   // MTN | AIRTEL | ZAMTEL
    };

    console.log("🔵 Sending to Lipila:", payload);

    // --- SEND TO LIPILA ---
    const lipilaResp = await fetch(
      "https://lipila-uat.hobbiton.app/transactions/mobile-money",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    let lipilaJson;
    try {
      lipilaJson = await lipilaResp.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON response from Lipila" },
        { status: 500 }
      );
    }

    console.log("🟢 Lipila Response:", lipilaJson);

    // --- HANDLE LIPILA FAILURE ---
    if (!lipilaResp.ok) {
      return Response.json(
        {
          error: lipilaJson.message || "Lipila rejected the request",
          details: lipilaJson
        },
        { status: 400 }
      );
    }

    // --- SUCCESS RESPONSE ---
    const orderId =
      lipilaJson.transactionId ||
      lipilaJson.externalId ||
      lipilaJson.id ||
      null;

    return Response.json({
      success: true,
      orderId,
      lipila: lipilaJson
    });

  } catch (err) {
    console.error("❌ Server Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
