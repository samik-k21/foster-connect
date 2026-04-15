export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { intakeNote, homeProfiles } = req.body

  const MATCH_PROMPT = `You are a foster care placement specialist. Given a child intake note and foster home profiles, extract needs and score compatibility.

1. Extract every child need with urgency: high, medium, or low.
   high = non-negotiable or clinical (Halal diet, no pets due to asthma, twins must stay together)
   medium = strongly preferred (school district, language match, therapy proximity)
   low = nice to have

2. Score each home 0-100. Hard constraint violations score below 40:
   - Pets in home when child has asthma triggered by animals
   - Fewer beds than children being placed together
   - Missing trauma license when clinically required

3. For each home: metNeeds array and unmetNeeds array (short plain English strings).
4. messagingUnlocked: true for scores 70 and above.
5. Sort by matchScore descending.

Return ONLY valid JSON, no markdown, no preamble:
{
  "childNeeds": [{ "need": "Halal diet", "urgency": "high" }],
  "rankedMatches": [{
    "homeId": "H-001",
    "familyName": "Martinez",
    "matchScore": 87,
    "metNeeds": ["Halal diet", "SE school district"],
    "unmetNeeds": ["Therapy within 10 miles — nearest is 22 miles away"],
    "notes": "Strong cultural match. Therapy gap needs follow-up.",
    "messagingUnlocked": true
  }]
}`

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: MATCH_PROMPT,
      messages: [{
        role: 'user',
        content: 'Child intake note:\n' + intakeNote + '\n\nFoster home profiles:\n' + JSON.stringify(homeProfiles)
      }]
    })

    const text = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const transformed = parsed.rankedMatches.map(match => ({
      id: match.homeId,
      familyName: match.familyName,
      score: match.matchScore,
      notes: match.notes,
      messagingUnlocked: match.messagingUnlocked,
      needs: [
        ...match.metNeeds.map(label => ({ label, met: true })),
        ...match.unmetNeeds.map(label => ({ label: label.split('—')[0].trim(), met: false }))
      ]
    }))

    res.json({ childNeeds: parsed.childNeeds, rankedMatches: transformed })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
