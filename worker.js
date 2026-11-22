
export default {
 async fetch(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/health") {
   return Response.json({
    ok: true,
    service: "My Personal AI",
    aiConfigured: !!env.GEMINI_API_KEY
   });
  }

  if (url.pathname === "/api/chat" && request.method === "POST") {
   if (!env.GEMINI_API_KEY) {
    return Response.json({
     error: "Gemini API key is not configured."
    }, { status: 503 });
   }

   try {
    const body = await request.json();
    const message = typeof body.message === "string"
     ? body.message.trim() : "";

    if (!message) {
     return Response.json({ error: "Please enter a message." }, { status: 400 });
    }

    const history = Array.isArray(body.history)
     ? body.history.slice(-10) : [];

    const contents = [];

    for (const item of history) {
     if (item && ["user", "model"].includes(item.role)
      && typeof item.content === "string") {
      contents.push({
       role: item.role,
       parts: [{ text: item.content.slice(0, 10000) }]
      });
     }
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await fetch(
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
      + encodeURIComponent(env.GEMINI_API_KEY),
     {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
       systemInstruction: {
        parts: [{
         text: "You are My Personal AI. Reply in the user's language. Be helpful and clear."
        }]
       },
       contents,
       generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7
       }
      })
     }
    );

    const data = await response.json();

    if (!response.ok) {
     return Response.json({ error: "AI provider request failed." }, {
      status: response.status
     });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
     .map(part => part.text || "").join("").trim();

    return Response.json({ reply: reply || "No response received." });

   } catch (error) {
    return Response.json({ error: "Server error. Try again." }, {
     status: 500
    });
   }
  }

  return env.ASSETS.fetch(request);
 }
};
