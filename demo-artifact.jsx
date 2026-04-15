// Paste this entire file into Claude.ai Artifacts (React mode)
// No imports needed — React is available globally in that environment.

const { useState, useRef, useEffect } = React

// ── Embedded data ─────────────────────────────────────────────────────────────

const homeProfiles = [
  { id:'H-001', familyName:'Martinez', district:'SE', bedsAvailable:2,  languages:['Spanish','English'], dietaryCapability:['Halal'],          therapyProximityMiles:22, specialNeedsLicensed:false, currentChildrenCount:1, petsInHome:false },
  { id:'H-002', familyName:'Chen',     district:'NW', bedsAvailable:1,  languages:['English'],           dietaryCapability:['standard'],        therapyProximityMiles:3,  specialNeedsLicensed:true,  currentChildrenCount:0, petsInHome:true  },
  { id:'H-003', familyName:'Okafor',   district:'SE', bedsAvailable:1,  languages:['Somali','English'],  dietaryCapability:['Halal'],           therapyProximityMiles:14, specialNeedsLicensed:false, currentChildrenCount:2, petsInHome:false },
  { id:'H-004', familyName:'Rivera',   district:'SW', bedsAvailable:3,  languages:['Spanish','English'], dietaryCapability:['Halal','Kosher'],  therapyProximityMiles:8,  specialNeedsLicensed:true,  currentChildrenCount:0, petsInHome:false },
  { id:'H-005', familyName:'Thompson', district:'NE', bedsAvailable:1,  languages:['English'],           dietaryCapability:['standard'],        therapyProximityMiles:31, specialNeedsLicensed:false, currentChildrenCount:3, petsInHome:true  },
]

const intakeNotes = [
  { id:'C-001', childName:'Amina',           age:9,  note:"Amina is a 9-year-old girl who came into care last Thursday. She speaks Somali as her first language. She follows a Halal diet — non-negotiable. She has generalized anxiety and her therapist recommends weekly sessions without interruption. She attends Jefferson Elementary in the SE district and has friends there. No siblings. No behavioral challenges." },
  { id:'C-002', childName:'Marcus',          age:14, note:"Marcus is 14 with PTSD from domestic violence exposure. This is his fourth placement. Two prior placements ended due to dysregulation, one due to a physical altercation. He needs a trauma-informed home — clinically required. English only. No dietary restrictions. Crowded homes are a trigger. Fewer kids and predictable structure work best." },
  { id:'C-003', childName:'Sofia and Lucia', age:6,  note:"Sofia and Lucia are 6-year-old twins who must be placed together — hard requirement. Both are Spanish-dominant with limited English. Sofia has moderate asthma — pets in the home are a hard medical constraint, animal dander triggers episodes. No dietary restrictions. They adapt well as long as they have each other. ESL support required at new school." },
]

// ── Matching engine ───────────────────────────────────────────────────────────

function extractNeeds(noteText) {
  const t = noteText.toLowerCase()
  const needs = []

  if (t.includes('halal'))
    needs.push({ id:'halal',    label:'Halal diet',                urgency:'high',   check: h => h.dietaryCapability.includes('Halal') })
  if (t.includes('kosher'))
    needs.push({ id:'kosher',   label:'Kosher diet',               urgency:'high',   check: h => h.dietaryCapability.includes('Kosher') })
  if (t.includes('somali'))
    needs.push({ id:'somali',   label:'Somali-speaking home',      urgency:'medium', check: h => h.languages.includes('Somali') })
  if (t.includes('spanish') || t.includes('spanish-dominant'))
    needs.push({ id:'spanish',  label:'Spanish-speaking home',     urgency:'high',   check: h => h.languages.includes('Spanish') })
  if (t.includes('asthma') || t.includes('animal dander') || t.includes('pet') && t.includes('trigger'))
    needs.push({ id:'nopets',   label:'Pet-free home',             urgency:'high',   check: h => !h.petsInHome })
  if (t.includes('ptsd') || t.includes('trauma'))
    needs.push({ id:'trauma',   label:'Trauma-informed licensed',  urgency:'high',   check: h => h.specialNeedsLicensed })
  if (t.includes('therapy') || t.includes('therapist'))
    needs.push({ id:'therapy',  label:'Therapy within 15 mi',      urgency:'medium', check: h => h.therapyProximityMiles <= 15 })
  if (t.includes('twins') || (t.includes('together') && t.includes('placed')))
    needs.push({ id:'beds2',    label:'2+ beds available',         urgency:'high',   check: h => h.bedsAvailable >= 2 })
  if (t.includes('crowded') || t.includes('fewer kids') || t.includes('low-capacity'))
    needs.push({ id:'lowcap',   label:'Low-capacity home (≤1 child)', urgency:'medium', check: h => h.currentChildrenCount <= 1 })

  const dm = t.match(/\b(se|nw|sw|ne)\b.{0,20}district|\bdistrict\b.{0,10}\b(se|nw|sw|ne)\b/)
  if (dm) {
    const dist = (dm[1] || dm[2]).toUpperCase()
    needs.push({ id:'district', label:`${dist} district`,          urgency:'medium', check: h => h.district === dist })
  }

  return needs
}

function scoreHome(home, needs) {
  if (needs.length === 0) return { score: 50, metNeeds: [], unmetNeeds: [] }

  const weights = { high: 30, medium: 15, low: 8 }
  let totalWeight = 0
  let earned = 0
  const met = []
  const unmet = []
  let hardViolation = false

  for (const need of needs) {
    const w = weights[need.urgency] || 10
    totalWeight += w
    if (need.check(home)) {
      earned += w
      met.push(need.label)
    } else {
      unmet.push(need.label)
      if (need.urgency === 'high') hardViolation = true
    }
  }

  let score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 50
  if (hardViolation) score = Math.min(score, 42)
  score = Math.max(10, Math.min(99, score))

  return { score, metNeeds: met, unmetNeeds: unmet }
}

function buildNotes(home, metNeeds, unmetNeeds) {
  const parts = []
  if (metNeeds.length)   parts.push(metNeeds.slice(0, 2).join(', ') + ' confirmed')
  if (unmetNeeds.length) parts.push(unmetNeeds[0] + ' — follow-up needed')
  if (home.therapyProximityMiles > 15) parts.push(`Therapy ${home.therapyProximityMiles} mi away`)
  if (!parts.length) parts.push('Review profile for compatibility details')
  return parts.join('. ')
}

// ── Flag detection ────────────────────────────────────────────────────────────

function detectFlags(messages) {
  const t = messages.filter(m => m.sender !== 'system').map(m => m.text).join(' ').toLowerCase()

  const greenPatterns = [
    { phrase: 'halal',          label: 'Confirmed Halal kitchen' },
    { phrase: 'experience with',label: 'Relevant family experience' },
    { phrase: 'happy to',       label: 'Family expressing willingness' },
    { phrase: 'we can handle',  label: 'Can accommodate transport' },
    { phrase: 'looking forward',label: 'Positive engagement' },
    { phrase: 'welcome',        label: 'Family expressed openness' },
    { phrase: 'next steps',     label: 'Ready to move forward' },
    { phrase: 'bilingual',      label: 'Bilingual home confirmed' },
  ]
  const redPatterns = [
    { phrase: "can't",          label: 'Family indicated inability' },
    { phrase: 'unable',         label: 'Unable to accommodate' },
    { phrase: 'not sure',       label: 'Family expressed uncertainty' },
    { phrase: 'unfortunately',  label: 'Limitation flagged' },
    { phrase: 'concern',        label: 'Concern raised' },
    { phrase: 'difficult',      label: 'Difficulty noted' },
    { phrase: 'unavailable',    label: 'Availability issue' },
  ]

  const green = greenPatterns.filter(p => t.includes(p.phrase)).map(p => p.label)
  const red   = redPatterns.filter(p => t.includes(p.phrase)).map(p => p.label)
  const delta = Math.min(15, Math.max(-15, green.length * 3 - red.length * 4))
  return { green, red, delta }
}

// ── Draft generation ──────────────────────────────────────────────────────────

function generateDraft(thread, needs, childName) {
  const allText = thread.map(m => m.text).join(' ').toLowerCase()
  const familyReplied = thread.some(m => m.sender === 'family')

  const unaddressed = needs.filter(n => {
    if (n.urgency !== 'high') return false
    const keywords = n.label.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(k => k.length > 3)
    return !keywords.some(k => allText.includes(k))
  })

  if (!familyReplied)
    return `Hi — reaching out about a potential placement for a child who may be a strong fit for your home. Would you be open to a brief conversation about the details?`
  if (unaddressed.length > 0)
    return `Thank you for your response. One important detail we need to confirm for ${childName}: ${unaddressed[0].label.toLowerCase()}. Would your family be able to accommodate that?`
  return `Thank you for being so responsive. I'd like to schedule a call to discuss next steps for ${childName}'s potential placement. What times work best for you this week?`
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const base = { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }

function scoreBadge(score) {
  const s = { padding: '1px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }
  if (score >= 80) return { ...s, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
  if (score >= 60) return { ...s, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }
  return               { ...s, background: '#fee2e2', color: '#991b1b',  border: '1px solid #fecaca' }
}

function urgencyChipStyle(urgency, on) {
  const colors = {
    high:   { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    medium: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
    low:    { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
  }
  const c = colors[urgency] || colors.low
  return {
    fontSize: '11px', padding: '3px 10px', borderRadius: '99px', cursor: 'pointer',
    fontWeight: on ? '600' : '400',
    background: on ? c.bg : '#f9fafb',
    color:      on ? c.text : '#9ca3af',
    border:     on ? `1px solid ${c.border}` : '1px solid #e5e7eb',
    textDecoration: on ? 'none' : 'line-through',
    transition: 'all 0.15s',
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NeedBadge({ label, met }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '11px', padding: '2px 7px', borderRadius: '3px',
      border:     met ? '1px solid #bbf7d0' : '1px solid #fecaca',
      background: met ? '#f0fdf4'           : '#fff5f5',
      color:      met ? '#166534'           : '#991b1b',
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

function MatchCard({ match, activeId, onOpenThread, adjustedScore, delta }) {
  const active       = match.id === activeId
  const displayScore = adjustedScore ?? match.score
  return (
    <div style={{
      background: '#fff', borderRadius: '4px', padding: '14px',
      border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', gap: '9px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: '600', fontSize: '13px' }}>{match.familyName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {delta !== 0 && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: delta > 0 ? '#16a34a' : '#dc2626' }}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          <span style={scoreBadge(displayScore)}>{displayScore}%</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {match.needs.map(n => <NeedBadge key={n.label} label={n.label} met={n.met} />)}
      </div>
      <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{match.notes}</p>
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
  const [selectedChildId,   setSelectedChildId]   = useState('C-001')
  const [activeThreadId,    setActiveThreadId]     = useState(null)
  const [threads,           setThreads]            = useState({})
  const [inputText,         setInputText]          = useState('')
  const [matches,           setMatches]            = useState([])
  const [allNeeds,          setAllNeeds]           = useState([])
  const [activeNeedIds,     setActiveNeedIds]      = useState(new Set())
  const [loading,           setLoading]            = useState(false)
  const [scoreAdjustments,  setScoreAdjustments]   = useState({})
  const [convFlags,         setConvFlags]          = useState({})

  const selectedChild = intakeNotes.find(c => c.id === selectedChildId)
  const activeMatch   = matches.find(m => m.id === activeThreadId)
  const activeNeeds   = allNeeds.filter(n => activeNeedIds.has(n.id))

  // Recompute all scores live when needs are toggled
  useEffect(() => {
    if (allNeeds.length === 0) return
    const recomputed = homeProfiles.map(home => {
      const { score, metNeeds, unmetNeeds } = scoreHome(home, activeNeeds)
      return {
        id:               home.id,
        familyName:       home.familyName + ' family',
        score,
        notes:            buildNotes(home, metNeeds, unmetNeeds),
        needs:            [
          ...metNeeds.map(l => ({ label: l, met: true })),
          ...unmetNeeds.map(l => ({ label: l, met: false })),
        ],
        messagingUnlocked: score >= 70,
      }
    }).sort((a, b) => b.score - a.score)
    setMatches(recomputed)
  }, [activeNeedIds, allNeeds])

  // ── Analyze ──────────────────────────────────────────────────────────────────

  function analyze() {
    setLoading(true)
    setMatches([])
    setAllNeeds([])
    setActiveNeedIds(new Set())
    setScoreAdjustments({})
    setConvFlags({})
    setTimeout(() => {
      const needs  = extractNeeds(selectedChild.note)
      setAllNeeds(needs)
      setActiveNeedIds(new Set(needs.map(n => n.id)))
      setLoading(false)
    }, 700)
  }

  // ── Need toggle ───────────────────────────────────────────────────────────────

  function toggleNeed(id) {
    setActiveNeedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Thread helpers ────────────────────────────────────────────────────────────

  function openThread(matchId, familyName) {
    setActiveThreadId(matchId)
    setThreads(prev => prev[matchId] ? prev : {
      ...prev,
      [matchId]: [{
        id: Date.now(), sender: 'system',
        text: 'Thread opened with ' + familyName + '. All messages are logged and supervised.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    })
  }

  function sendMessage() {
    if (!inputText.trim() || !activeThreadId) return
    const msg = {
      id: Date.now(), sender: 'worker', name: 'S. Rawat',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const updated = [...(threads[activeThreadId] || []), msg]
    setThreads(prev => ({ ...prev, [activeThreadId]: updated }))
    const { green, red, delta } = detectFlags(updated)
    setConvFlags(prev => ({ ...prev, [activeThreadId]: { green, red } }))
    setScoreAdjustments(prev => ({ ...prev, [activeThreadId]: delta }))
    setInputText('')
  }

  function getDraft() {
    const thread = threads[activeThreadId] || []
    setInputText(generateDraft(thread, activeNeeds, selectedChild?.childName))
  }

  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threads, activeThreadId])

  // ── Left panel ────────────────────────────────────────────────────────────────

  const leftPanel = (
    <div style={{
      width: '45%', minWidth: '320px', borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#fff',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>FosterConnect</p>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Placement matching assistant</p>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Child selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Child</label>
          <select
            value={selectedChildId}
            onChange={e => {
              setSelectedChildId(e.target.value)
              setActiveThreadId(null); setThreads({}); setMatches([])
              setAllNeeds([]); setActiveNeedIds(new Set())
              setScoreAdjustments({}); setConvFlags({})
            }}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
          >
            {intakeNotes.map(c => <option key={c.id} value={c.id}>{c.childName} — age {c.age}</option>)}
          </select>
        </div>

        {/* Intake note */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Intake note</label>
          <textarea
            readOnly rows={6} value={selectedChild?.note ?? ''}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px 10px', fontSize: '12px', color: '#6b7280', background: '#f9fafb', resize: 'none', outline: 'none', lineHeight: '1.55', fontFamily: 'system-ui, sans-serif' }}
          />
        </div>

        {/* Analyze button */}
        <button
          onClick={analyze} disabled={loading}
          style={{ width: '100%', background: loading ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '9px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Analyzing…' : 'Analyze placement'}
        </button>

        {/* ── COOL FEATURE: live toggleable need chips ── */}
        {allNeeds.length > 0 && (
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Detected needs — toggle to update scores live
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {allNeeds.map(need => (
                <button key={need.id} onClick={() => toggleNeed(need.id)} style={urgencyChipStyle(need.urgency, activeNeedIds.has(need.id))}>
                  {need.label}
                </button>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#b0b8c4' }}>
              Red = hard constraint · Yellow = strongly preferred
            </p>
          </div>
        )}

        {/* Match cards */}
        {matches.length > 0 && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ranked matches — {matches.length} homes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {matches.map(m => {
                const delta         = scoreAdjustments[m.id] ?? 0
                const adjustedScore = Math.min(100, Math.max(0, m.score + delta))
                return (
                  <MatchCard
                    key={m.id} match={m} activeId={activeThreadId}
                    onOpenThread={id => openThread(id, m.familyName)}
                    adjustedScore={adjustedScore} delta={delta}
                  />
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )

  // ── Right panel ───────────────────────────────────────────────────────────────

  const emptyState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9ca3af' }}>
      <svg width="32" height="32" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span style={{ fontSize: '13px' }}>Select a match to open a conversation</span>
    </div>
  )

  const threadPanel = activeMatch && (() => {
    const delta       = scoreAdjustments[activeThreadId] ?? 0
    const threadScore = Math.min(100, Math.max(0, activeMatch.score + delta))
    const flags       = convFlags[activeThreadId]
    return (
      <>
        {/* Thread header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>{activeMatch.familyName}</p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>Re: {selectedChild?.childName}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {delta !== 0 && (
                <span style={{ fontSize: '11px', fontWeight: '600', color: delta > 0 ? '#16a34a' : '#dc2626' }}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
              <span style={scoreBadge(threadScore)}>{threadScore}%</span>
            </div>
          </div>
          {flags && (flags.green.length > 0 || flags.red.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
              {flags.green.map(f => (
                <span key={f} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '3px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>✓ {f}</span>
              ))}
              {flags.red.map(f => (
                <span key={f} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '3px', background: '#fff5f5', color: '#991b1b', border: '1px solid #fecaca' }}>✗ {f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(threads[activeThreadId] || []).map(msg => {
            if (msg.sender === 'system') return (
              <div key={msg.id} style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', padding: '4px 0' }}>{msg.text}</div>
            )
            const isWorker = msg.sender === 'worker'
            return (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexDirection: isWorker ? 'row-reverse' : 'row' }}>
                <Avatar name={msg.name} worker={isWorker} />
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '68%', alignItems: isWorker ? 'flex-end' : 'flex-start' }}>
                  <div style={{ padding: '9px 13px', fontSize: '13px', lineHeight: '1.5', borderRadius: isWorker ? '8px 8px 0 8px' : '8px 8px 8px 0', background: isWorker ? '#2563eb' : '#fff', color: isWorker ? '#fff' : '#111827', border: isWorker ? 'none' : '1px solid #e5e7eb' }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{msg.timestamp}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <textarea
              rows={2} value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message… (Enter to send)"
              style={{ flex: 1, boxSizing: 'border-box', resize: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'system-ui, sans-serif' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button onClick={sendMessage} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Send</button>
              <button onClick={getDraft} style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', padding: '5px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Draft</button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>All messages logged · worker oversight required</p>
        </div>
      </>
    )
  })()

  return (
    <div style={{ ...base, display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>
      {leftPanel}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeMatch ? threadPanel : emptyState}
      </div>
    </div>
  )
}
