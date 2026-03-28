// Note: Direct browser calls to Anthropic API require CORS to be handled (e.g. via a proxy)

export async function analyzeTranscript(transcript: string): Promise<{ title: string; feedback: string }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert cold call coach. Analyze the following call transcript and respond with JSON only — no prose, no markdown fences, just raw JSON.

The JSON must have exactly this shape:
{"title": "...", "feedback": "..."}

- "title": A concise title for this call, max 8 words, capturing its key theme or outcome.
- "feedback": Detailed coaching analysis in markdown. Cover: what went well, what could improve, specific moments, and actionable next steps.

Transcript:
${transcript}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text: string = data.content?.[0]?.text ?? ''

  // Strip markdown code fences if model wraps the JSON anyway
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  const parsed = JSON.parse(cleaned) as { title: string; feedback: string }
  return { title: parsed.title, feedback: parsed.feedback }
}
