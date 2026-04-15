export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { threadMessages, childNeeds, homeName } = req.body

  const DRAFT_PROMPT = `You are assisting a social worker in a foster care placement conversation.
Draft the next message the social worker should send to the foster family.
- Warm, professional, specific tone
- Reference actual child needs by name where relevant
- Maximum 2-3 sentences
- Do not start with I or As a social worker
- Return ONLY the message text. No quotes. No preamble. No JSON.`

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: DRAFT_PROMPT,
      messages: [{
        role: 'user',
        content: 'Foster family: ' + homeName +
          '\nChild needs: ' + JSON.stringify(childNeeds) +
          '\nThread so far:\n' + (threadMessages || []).map(m => m.sender + ': ' + m.text).join('\n')
      }]
    })

    res.json({ draft: message.content[0].text.trim() })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
