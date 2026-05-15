// /api/chat.js
export default async function handler(req, res) {
  const { messages, persona } = req.body;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}` // HIDDEN KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Vibe Check Failed on Server" });
  }
}