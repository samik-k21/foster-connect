import http from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

// Load .env.local
const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const env = readFileSync(join(__dir, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

const DRAFT_PROMPT = `You are assisting a social worker in a foster care placement conversation.
Draft the next message the social worker should send to the foster family.
- Warm, professional, specific tone
- Reference actual child needs by name where relevant
- Maximum 2-3 sentences
- Do not start with I or As a social worker
- Return ONLY the message text. No quotes. No preamble. No JSON.`

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => { try { resolve(JSON.parse(data)) } catch(e) { reject(e) } })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  setCORS(res)

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  if (req.method === 'POST' && req.url === '/api/match') {
    try {
      const { intakeNote, homeProfiles } = await readBody(req)
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: MATCH_PROMPT,
        messages: [{ role: 'user', content: 'Child intake note:\n' + intakeNote + '\n\nFoster home profiles:\n' + JSON.stringify(homeProfiles) }]
      })
      const clean = message.content[0].text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      const transformed = parsed.rankedMatches.map(m => ({
        id: m.homeId,
        familyName: m.familyName,
        matchScore: m.matchScore,
        notes: m.notes,
        messagingUnlocked: m.messagingUnlocked,
        needs: [
          ...m.metNeeds.map(label => ({ label, met: true })),
          ...m.unmetNeeds.map(label => ({ label: label.split('—')[0].trim(), met: false }))
        ]
      }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ childNeeds: parsed.childNeeds, rankedMatches: transformed }))
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  if (req.method === 'POST' && req.url === '/api/draft') {
    try {
      const { threadMessages, childNeeds, homeName } = await readBody(req)
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
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ draft: message.content[0].text.trim() }))
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  res.writeHead(404); res.end()
})

server.listen(3000, () => {
  console.log('API server running on http://localhost:3000')
  console.log('  POST /api/match')
  console.log('  POST /api/draft')
})
