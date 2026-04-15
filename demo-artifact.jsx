// Paste this entire file into Claude.ai Artifacts (React mode)
// No imports needed — React is available globally in that environment.

const { useState } = React

// ── Embedded data ────────────────────────────────────────────────────────────

const homeProfiles = [
  { id:"H-001", familyName:"Martinez", district:"SE", bedsAvailable:2, languages:["Spanish","English"], dietaryCapability:["Halal"], therapyProximityMiles:22, specialNeedsLicensed:false, currentChildrenCount:1, petsInHome:false },
  { id:"H-002", familyName:"Chen",     district:"NW", bedsAvailable:1, languages:["English"],           dietaryCapability:["standard"], therapyProximityMiles:3,  specialNeedsLicensed:true,  currentChildrenCount:0, petsInHome:true  },
  { id:"H-003", familyName:"Okafor",   district:"SE", bedsAvailable:1, languages:["Somali","English"],  dietaryCapability:["Halal"],    therapyProximityMiles:14, specialNeedsLicensed:false, currentChildrenCount:2, petsInHome:false },
  { id:"H-004", familyName:"Rivera",   district:"SW", bedsAvailable:3, languages:["Spanish","English"], dietaryCapability:["Halal","Kosher"], therapyProximityMiles:8, specialNeedsLicensed:true, currentChildrenCount:0, petsInHome:false },
  { id:"H-005", familyName:"Thompson", district:"NE", bedsAvailable:1, languages:["English"],           dietaryCapability:["standard"], therapyProximityMiles:31, specialNeedsLicensed:false, currentChildrenCount:3, petsInHome:true  },
]

const intakeNotes = [
  { id:"C-001", childName:"Amina",          age:9,  note:"Amina is a 9-year-old girl who came into care last Thursday. She speaks Somali as her first language. She follows a Halal diet — non-negotiable. She has generalized anxiety and her therapist recommends weekly sessions without interruption. She attends Jefferson Elementary in the SE district and has friends there. No siblings. No behavioral challenges." },
  { id:"C-002", childName:"Marcus",         age:14, note:"Marcus is 14 with PTSD from domestic violence exposure. This is his fourth placement. Two prior placements ended due to dysregulation, one due to a physical altercation. He needs a trauma-informed home — clinically required. English only. No dietary restrictions. Crowded homes are a trigger. Fewer kids and predictable structure work best." },
  { id:"C-003", childName:"Sofia and Lucia",age:6,  note:"Sofia and Lucia are 6-year-old twins who must be placed together — hard requirement. Both are Spanish-dominant with limited English. Sofia has moderate asthma — pets in the home are a hard medical constraint, animal dander triggers episodes. No dietary restrictions. They adapt well as long as they have each other. ESL support required at new school." },
]

// ── Mock thread ───────────────────────────────────────────────────────────────

const MOCK_THREAD = [
  {
    id: 1,
    sender: 'worker',
    name: 'S. Rawat',
    text: 'Hi — reaching out about a potential placement. 9-year-old girl, bilingual Somali/English, strict Halal diet. Your home looks like a strong cultural fit.',
    timestamp: 'Apr 12 · 2:14 PM',
  },
  {
    id: 2,
    sender: 'family',
    name: 'Martinez',
    text: "Hello! We'd love to help. We already maintain a Halal kitchen and have experience with bilingual children.",
    timestamp: 'Apr 12 · 3:02 PM',
  },
  {
    id: 3,
    sender: 'worker',
    name: 'S. Rawat',
    text: 'Great to hear. Her weekly therapy is 22 miles from your address — would transport be manageable?',
    timestamp: 'Apr 12 · 3:15 PM',
  },
]

// ── Match prompt ─────────────────────────────────────────────────────────────

const MATCH_PROMPT = `You are a foster care placement specialist. Given a child intake note and foster home profiles, extract needs and score compatibility.

1. Extract every child need with urgency: high, medium, or low.
   high = non-negotiable or clinical (Halal diet, no pets due to asthma, twins must stay together)
   medium = strongly preferred (school district, language match, therapy proximity)
   low = nice to have

2. Score each home 0-100. Hard constraint violations score below 40:
   - Pets in home when child has asthma triggered by animals
   - Fewer beds than children being placed
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

// ── Style helpers ─────────────────────────────────────────────────────────────

const base = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize:   '13px',
  color:      '#111827',
  boxSizing:  'border-box',
}

function scoreBadge(score) {
  const shared = { padding: '1px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }
  if (score >= 80) return { ...shared, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
  if (score >= 60) return { ...shared, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }
  return              { ...shared, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NeedBadge({ label, met }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '11px', padding: '2px 7px', borderRadius: '3px',
      border:           met ? '1px solid #bbf7d0' : '1px solid #fecaca',
      background:       met ? '#f0fdf4'           : '#fff5f5',
      color:            met ? '#166534'           : '#991b1b',
    }}>
      {met ? '✓' : '✗'} {label}
    </span>
  )
}

function Avatar({ name, worker }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
      background: worker ? '#2563eb' : '#9ca3af',
      color: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '11px', fontWeight: '700',
    }}>
      {initials}
    </div>
  )
}

function MatchCard({ match, activeId, onOpenThread }) {
  const active = match.id === activeId
  return (
    <div style={{
      background: '#fff', borderRadius: '4px', padding: '14px',
      border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', gap: '9px',
    }}>
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: '600', fontSize: '13px' }}>{match.familyName}</span>
        <span style={scoreBadge(match.score)}>{match.score}%</span>
      </div>
      {/* need badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {match.needs.map(n => <NeedBadge key={n.label} label={n.label} met={n.met} />)}
      </div>
      {/* notes */}
      <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{match.notes}</p>
      {/* open thread */}
      {match.messagingUnlocked && (
        <button
          onClick={() => onOpenThread(match.id)}
          style={{
            alignSelf: 'flex-start', fontSize: '11px', fontWeight: '500',
            color: '#2563eb', background: '#fff', cursor: 'pointer',
            border: '1px solid #bfdbfe', borderRadius: '3px', padding: '3px 10px',
          }}
        >
          Open thread →
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FosterConnect() {
  const [selectedChildId, setSelectedChildId] = useState('C-001')
  const [apiKey,          setApiKey]          = useState('')
  const [activeThreadId,  setActiveThreadId]  = useState('H-001')
  const [inputText,       setInputText]       = useState('')
  const [matches,         setMatches]         = useState([])
  const [childNeeds,      setChildNeeds]      = useState([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  const selectedChild = intakeNotes.find(c => c.id === selectedChildId)
  const activeMatch   = matches.find(m => m.id === activeThreadId)

  // ── Analyze ─────────────────────────────────────────────────────────────────

  async function analyze() {
    if (!apiKey) { setError('Enter your Anthropic API key first'); return }
    setLoading(true)
    setError('')
    setMatches([])
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: MATCH_PROMPT,
          messages: [{
            role: 'user',
            content: 'Child intake note:\n' + selectedChild.note + '\n\nFoster home profiles:\n' + JSON.stringify(homeProfiles),
          }],
        }),
      })
      const data = await res.json()
      const text = data.content[0].text
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setChildNeeds(parsed.childNeeds)
      const transformed = parsed.rankedMatches.map(match => ({
        id: match.homeId,
        familyName: match.familyName,
        matchScore: match.matchScore,
        score: match.matchScore,
        notes: match.notes,
        messagingUnlocked: match.messagingUnlocked,
        needs: [
          ...match.metNeeds.map(label => ({ label, met: true })),
          ...match.unmetNeeds.map(label => ({ label: label.split('—')[0].trim(), met: false })),
        ],
      }))
      setMatches(transformed)
    } catch (e) {
      setError('Analysis failed — check your API key and try again')
    }
    setLoading(false)
  }

  // ── Left panel ──────────────────────────────────────────────────────────────
  const leftPanel = (
    <div style={{
      width: '45%', minWidth: '320px',
      borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', background: '#fff',
    }}>
      {/* header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>FosterConnect</p>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>AI-powered foster placement matching</p>
      </div>

      {/* scrollable content */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* API key */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #d1d5db', borderRadius: '4px',
              padding: '7px 10px', fontSize: '13px', outline: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}
          />
        </div>

        {/* child selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Child
          </label>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #d1d5db', borderRadius: '4px',
              padding: '7px 10px', fontSize: '13px', outline: 'none',
              background: '#fff', cursor: 'pointer',
            }}
          >
            {intakeNotes.map(c => (
              <option key={c.id} value={c.id}>{c.childName} — age {c.age}</option>
            ))}
          </select>
        </div>

        {/* intake note */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Intake note
          </label>
          <textarea
            readOnly
            rows={6}
            value={selectedChild?.note ?? ''}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #e5e7eb', borderRadius: '4px',
              padding: '8px 10px', fontSize: '12px', color: '#6b7280',
              background: '#f9fafb', resize: 'none', outline: 'none',
              lineHeight: '1.55', fontFamily: 'system-ui, sans-serif',
            }}
          />
        </div>

        {/* analyze button */}
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
            border: 'none', borderRadius: '4px', padding: '9px', fontSize: '13px',
            fontWeight: '500', cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Analyzing…' : 'Analyze placement'}
        </button>

        {/* loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              <circle cx="12" cy="12" r="10" stroke="#d1d5db" strokeWidth="4" />
              <path fill="#3b82f6" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyzing placement needs…
          </div>
        )}

        {/* error */}
        {error && (
          <p style={{ margin: 0, fontSize: '12px', color: '#dc2626' }}>{error}</p>
        )}

        {/* match cards */}
        {matches.length > 0 && (
          <div>
            <p style={{
              margin: '0 0 8px', fontSize: '10px', fontWeight: '600',
              color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Ranked matches — {matches.length} homes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  activeId={activeThreadId}
                  onOpenThread={setActiveThreadId}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )

  // ── Right panel — empty state ────────────────────────────────────────────────
  const emptyState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9ca3af' }}>
      <svg width="32" height="32" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span style={{ fontSize: '13px' }}>Select a match to open a conversation</span>
    </div>
  )

  // ── Right panel — thread ─────────────────────────────────────────────────────
  const threadPanel = activeMatch && (
    <>
      {/* thread header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
        background: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>{activeMatch.familyName}</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Re: {selectedChild?.childName}</p>
        </div>
        <span style={scoreBadge(activeMatch.score)}>{activeMatch.score}%</span>
      </div>

      {/* messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 20px', background: '#f9fafb',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {MOCK_THREAD.map(msg => {
          const isWorker = msg.sender === 'worker'
          return (
            <div key={msg.id} style={{
              display: 'flex', alignItems: 'flex-end', gap: '10px',
              flexDirection: isWorker ? 'row-reverse' : 'row',
            }}>
              <Avatar name={msg.name} worker={isWorker} />
              <div style={{
                display: 'flex', flexDirection: 'column', maxWidth: '68%',
                alignItems: isWorker ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  padding: '9px 13px', fontSize: '13px', lineHeight: '1.5',
                  borderRadius: isWorker ? '8px 8px 0 8px' : '8px 8px 8px 0',
                  background: isWorker ? '#2563eb' : '#fff',
                  color:      isWorker ? '#fff'    : '#111827',
                  border:     isWorker ? 'none'    : '1px solid #e5e7eb',
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* input bar */}
      <div style={{
        borderTop: '1px solid #e5e7eb', background: '#fff',
        padding: '12px 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <textarea
            rows={2}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message… (Enter to send)"
            style={{
              flex: 1, boxSizing: 'border-box', resize: 'none',
              border: '1px solid #d1d5db', borderRadius: '4px',
              padding: '7px 10px', fontSize: '13px', outline: 'none',
              fontFamily: 'system-ui, sans-serif',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '4px', padding: '5px 14px',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
            }}>
              Send
            </button>
            <button style={{
              background: '#fff', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: '4px',
              padding: '5px 14px', fontSize: '12px',
              fontWeight: '500', cursor: 'pointer',
            }}>
              AI Draft
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>
          All messages logged · worker oversight required
        </p>
      </div>
    </>
  )

  // ── Layout ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      ...base,
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#f9fafb',
    }}>
      {leftPanel}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeMatch ? threadPanel : emptyState}
      </div>
    </div>
  )
}
