export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { to, body, reviewRequestId } = req.body

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    await fetch(`${supabaseUrl}/rest/v1/review_requests?id=eq.${reviewRequestId}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        status: "failed",
        failure_reason: data.message || "SMS failed"
      })
    })

    return res.status(500).json({ error: data.message || "SMS failed" })
  }

  await fetch(`${supabaseUrl}/rest/v1/review_requests?id=eq.${reviewRequestId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      status: "sent",
      sent_at: new Date().toISOString(),
      failure_reason: null
    })
  })

  return res.status(200).json({ success: true, sid: data.sid })
}
