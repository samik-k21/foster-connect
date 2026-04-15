import { useState, useRef, useEffect } from 'react'
import intakeNotes from './data/intakeNotes.json'
import homeProfiles from './data/homeProfiles.json'

// ── Seeded demo threads ───────────────────────────────────────────────────────
const SEEDED_THREADS = {
  'C-001:H-001': [
    { id: 1, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 12 · 2:14 PM', text: "Hi — reaching out about a potential placement. 9-year-old girl, bilingual Somali/English, strict Halal diet. I think your home could be a strong cultural fit." },
    { id: 2, sender: 'family', name: 'Martinez', timestamp: 'Apr 12 · 3:02 PM', text: "Hello! We'd love to learn more. We have experience with bilingual children and already maintain a Halal kitchen." },
    { id: 3, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 12 · 3:15 PM', text: "Great to hear. She has weekly therapy she needs to continue — the nearest provider is about 22 miles. Would transport be manageable?" },
    { id: 4, sender: 'family', name: 'Martinez', timestamp: 'Apr 12 · 4:30 PM', text: "We can handle that — we do regular runs in that direction anyway. Happy to support her appointments. When can we schedule a call to discuss next steps?" },
  ],
  'C-002:H-004': [
    { id: 1, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 13 · 10:22 AM', text: "Hi — reaching out about a potential placement. 14-year-old male, PTSD diagnosis, needs a trauma-informed household. Your home came up as our strongest match." },
    { id: 2, sender: 'family', name: 'Rivera', timestamp: 'Apr 13 · 11:05 AM', text: "Thank you for reaching out. We're trained in trauma-informed care and have supported teenagers with similar histories. We're open to hearing more." },
    { id: 3, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 13 · 11:30 AM', text: "Glad to hear it. He's in therapy twice a week — you're about 8 miles from his provider which is very workable." },
    { id: 4, sender: 'family', name: 'Rivera', timestamp: 'Apr 13 · 1:15 PM', text: "That's manageable. We'd want to understand his triggers and routine before he arrives so we can set up for a smooth first week. Can we schedule a pre-placement call?" },
  ],
  'C-003:H-004': [
    { id: 1, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 14 · 9:10 AM', text: "Hi — reaching out about a sibling placement. Twin girls, age 6, must be placed together. Your home has two beds and is our top match." },
    { id: 2, sender: 'family', name: 'Rivera', timestamp: 'Apr 14 · 9:48 AM', text: "Hello! We'd absolutely welcome a sibling placement. We're bilingual so the language piece won't be a barrier. Tell us more about them." },
    { id: 3, sender: 'worker', name: 'S. Rawat', timestamp: 'Apr 14 · 10:05 AM', text: "One important medical note: Sofia has moderate asthma and animal dander is a documented trigger. Your pet-free household is actually a key reason you're at the top of our list." },
    { id: 4, sender: 'family', name: 'Rivera', timestamp: 'Apr 14 · 10:52 AM', text: "Completely understood. Pet-free, two beds, bilingual — we're ready to move forward. What does the next step look like on your end?" },
  ],
}

// ── Local matching engine ─────────────────────────────────────────────────────

function extractNeeds(noteText) {
  const t = noteText.toLowerCase()
  const needs = []

  if (t.includes('halal'))
    needs.push({ id: 'halal',    label: 'Halal diet',               urgency: 'high',   check: h => h.dietaryCapability.includes('Halal') })
  if (t.includes('kosher'))
    needs.push({ id: 'kosher',   label: 'Kosher diet',              urgency: 'high',   check: h => h.dietaryCapability.includes('Kosher') })
  if (t.includes('somali'))
    needs.push({ id: 'somali',   label: 'Somali-speaking home',     urgency: 'medium', check: h => h.languages.includes('Somali') })
  if (t.includes('spanish') || t.includes('spanish-dominant'))
    needs.push({ id: 'spanish',  label: 'Spanish-speaking home',    urgency: 'high',   check: h => h.languages.includes('Spanish') })
  if (t.includes('asthma') || t.includes('animal dander'))
    needs.push({ id: 'nopets',   label: 'Pet-free home',            urgency: 'high',   check: h => !h.petsInHome })
  if (t.includes('ptsd') || t.includes('trauma'))
    needs.push({ id: 'trauma',   label: 'Trauma-informed licensed', urgency: 'high',   check: h => h.specialNeedsLicensed })
  if (t.includes('therapy') || t.includes('therapist'))
    needs.push({ id: 'therapy',  label: 'Therapy within 15 mi',     urgency: 'medium', check: h => h.therapyProximityMiles <= 15 })
  if (t.includes('twins') || (t.includes('together') && t.includes('placed')))
    needs.push({ id: 'beds2',    label: '2+ beds available',        urgency: 'high',   check: h => h.bedsAvailable >= 2 })
  if (t.includes('crowded') || t.includes('fewer kids') || t.includes('low-capacity'))
    needs.push({ id: 'lowcap',   label: 'Low-capacity home',        urgency: 'medium', check: h => h.currentChildrenCount <= 1 })

  const dm = t.match(/\b(se|nw|sw|ne)\b.{0,20}district|\bdistrict\b.{0,10}\b(se|nw|sw|ne)\b/)
  if (dm) {
    const dist = (dm[1] || dm[2]).toUpperCase()
    needs.push({ id: 'district', label: `${dist} district`,         urgency: 'medium', check: h => h.district === dist })
  }

  return needs
}

function scoreHome(home, needs) {
  if (needs.length === 0) return { score: 50, metNeeds: [], unmetNeeds: [] }

  const weights = { high: 30, medium: 15, low: 8 }
  let totalWeight = 0, earned = 0
  const met = [], unmet = []
  let hardViolation = false

  for (const need of needs) {
    const w = weights[need.urgency] || 10
    totalWeight += w
    if (need.check(home)) { earned += w; met.push(need.label) }
    else { unmet.push(need.label); if (need.urgency === 'high') hardViolation = true }
  }

  let score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 50
  if (hardViolation) score = Math.min(score, 42)
  return { score: Math.max(10, Math.min(99, score)), metNeeds: met, unmetNeeds: unmet }
}

function buildNotes(home, metNeeds, unmetNeeds) {
  const parts = []
  if (metNeeds.length)   parts.push(metNeeds.slice(0, 2).join(', ') + ' confirmed')
  if (unmetNeeds.length) parts.push(unmetNeeds[0] + ' — follow-up needed')
  if (home.therapyProximityMiles > 15) parts.push(`Therapy ${home.therapyProximityMiles} mi away`)
  return parts.join('. ') || 'Review profile for compatibility details.'
}

function detectFlags(messages) {
  const t = messages.filter(m => m.sender !== 'system').map(m => m.text).join(' ').toLowerCase()
  const greenPatterns = [
    { phrase: 'halal',           label: 'Confirmed Halal kitchen' },
    { phrase: 'experience with', label: 'Relevant family experience' },
    { phrase: 'happy to',        label: 'Family expressing willingness' },
    { phrase: 'we can handle',   label: 'Can accommodate transport' },
    { phrase: 'looking forward', label: 'Positive engagement' },
    { phrase: 'welcome',         label: 'Family expressed openness' },
    { phrase: 'next steps',      label: 'Ready to move forward' },
    { phrase: 'bilingual',       label: 'Bilingual home confirmed' },
  ]
  const redPatterns = [
    { phrase: "can't",          label: 'Family indicated inability' },
    { phrase: 'unable',         label: 'Unable to accommodate' },
    { phrase: 'not sure',       label: 'Family expressed uncertainty' },
    { phrase: 'unfortunately',  label: 'Limitation flagged' },
    { phrase: 'concern',        label: 'Concern raised' },
    { phrase: 'difficult',      label: 'Difficulty noted' },
  ]
  const green = greenPatterns.filter(p => t.includes(p.phrase)).map(p => p.label)
  const red   = redPatterns.filter(p => t.includes(p.phrase)).map(p => p.label)
  const delta = Math.min(15, Math.max(-15, green.length * 3 - red.length * 4))
  return { green, red, delta }
}

function generateDraft(thread, needs, childName) {
  const allText      = thread.map(m => m.text).join(' ').toLowerCase()
  const familyReplied = thread.some(m => m.sender === 'family')
  const unaddressed  = needs.filter(n => {
    if (n.urgency !== 'high') return false
    const kws = n.label.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(k => k.length > 3)
    return !kws.some(k => allText.includes(k))
  })

  if (!familyReplied)
    return `Hi — reaching out about a potential placement for ${childName}. Based on your home profile, I think there could be a strong match. Would you be open to discussing the details?`
  if (unaddressed.length > 0)
    return `Thank you for your response. One important detail we need to confirm for ${childName}: ${unaddressed[0].label.toLowerCase()}. Would your family be able to accommodate that?`
  return `Thank you for being so responsive. I'd like to schedule a call to discuss next steps for ${childName}'s potential placement. What times work best for you this week?`
}

// ── Small components ──────────────────────────────────────────────────────────

function Spinner({ className = 'text-blue-500' }) {
  return (
    <svg className={`animate-spin h-4 w-4 flex-shrink-0 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function ScoreBadge({ score }) {
  const cls = score >= 80 ? 'bg-green-100 text-green-800 border-green-200'
    : score >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : 'bg-red-100 text-red-800 border-red-200'
  return <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>{score}%</span>
}

function NeedBadge({ label, met }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${met ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
      {met ? '✓' : '✗'} {label}
    </span>
  )
}

function Avatar({ name, side }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${side === 'worker' ? 'bg-blue-600' : 'bg-gray-400'}`}>
      {initials}
    </div>
  )
}

function MatchCard({ match, adjustedScore, delta, onOpenThread, isActive }) {
  return (
    <div className={`bg-white border rounded p-4 space-y-2.5 transition-colors ${isActive ? 'border-blue-400 shadow-sm' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{match.familyName}</span>
        <div className="flex items-center gap-1.5">
          {delta !== 0 && (
            <span className={`text-xs font-medium ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          <ScoreBadge score={adjustedScore} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {match.needs.map(n => <NeedBadge key={n.label} label={n.label} met={n.met} />)}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{match.notes}</p>
      <button
        onClick={() => onOpenThread(match)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:border-blue-400 px-3 py-1 rounded transition-colors"
      >
        Open thread →
      </button>
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedChildId,  setSelectedChildId]  = useState('C-001')
  const [isAnalyzing,      setIsAnalyzing]      = useState(false)
  const [rankedMatches,    setRankedMatches]     = useState([])
  const [allNeeds,         setAllNeeds]         = useState([])
  const [activeNeedIds,    setActiveNeedIds]    = useState(new Set())
  const [activeThread,     setActiveThread]     = useState(null)
  const [threadMessages,   setThreadMessages]   = useState([])
  const [inputText,        setInputText]        = useState('')
  const [scoreAdjustments, setScoreAdjustments] = useState({})
  const [convFlags,        setConvFlags]        = useState({})

  const messagesEndRef = useRef(null)
  const selectedChild  = intakeNotes.find(c => c.id === selectedChildId)
  const activeNeeds    = allNeeds.filter(n => activeNeedIds.has(n.id))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])

  // Recompute scores live when needs are toggled
  useEffect(() => {
    if (allNeeds.length === 0) return
    const recomputed = homeProfiles.map(home => {
      const { score, metNeeds, unmetNeeds } = scoreHome(home, activeNeeds)
      return {
        id: home.id,
        familyName: home.familyName + ' family',
        matchScore: score,
        notes: buildNotes(home, metNeeds, unmetNeeds),
        needs: [
          ...metNeeds.map(l => ({ label: l, met: true })),
          ...unmetNeeds.map(l => ({ label: l, met: false })),
        ],
      }
    }).sort((a, b) => b.matchScore - a.matchScore)
    setRankedMatches(recomputed)
  }, [activeNeedIds, allNeeds])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleChildChange = (e) => {
    setSelectedChildId(e.target.value)
    setRankedMatches([])
    setAllNeeds([])
    setActiveNeedIds(new Set())
    setActiveThread(null)
    setThreadMessages([])
    setInputText('')
    setScoreAdjustments({})
    setConvFlags({})
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setRankedMatches([])
    setAllNeeds([])
    setActiveNeedIds(new Set())
    setScoreAdjustments({})
    setConvFlags({})
    setTimeout(() => {
      const needs = extractNeeds(selectedChild.note)
      setAllNeeds(needs)
      setActiveNeedIds(new Set(needs.map(n => n.id)))
      setIsAnalyzing(false)
    }, 700)
  }

  const toggleNeed = (id) => {
    setActiveNeedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleOpenThread = (match) => {
    const msgs = SEEDED_THREADS[`${selectedChildId}:${match.id}`] ?? []
    setActiveThread(match)
    setThreadMessages(msgs)
    setInputText('')
    if (msgs.length > 0) {
      const { green, red, delta } = detectFlags(msgs)
      setConvFlags(prev => ({ ...prev, [match.id]: { green, red } }))
      setScoreAdjustments(prev => ({ ...prev, [match.id]: delta }))
    }
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!text) return
    const newMsg = {
      id: Date.now(), sender: 'worker', name: 'S. Rawat', text,
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    }
    const updated = [...threadMessages, newMsg]
    setThreadMessages(updated)
    const { green, red, delta } = detectFlags(updated)
    setConvFlags(prev => ({ ...prev, [activeThread.id]: { green, red } }))
    setScoreAdjustments(prev => ({ ...prev, [activeThread.id]: delta }))
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDraft = () => {
    setInputText(generateDraft(threadMessages, activeNeeds, selectedChild?.childName))
  }

  const getAdjustedScore = (match) => {
    const delta = scoreAdjustments[match.id] ?? 0
    return Math.min(100, Math.max(0, match.matchScore + delta))
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* LEFT PANEL */}
      <div className="w-[44%] min-w-[320px] flex flex-col border-r border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">FosterConnect</p>
          <p className="text-xs text-gray-400 mt-0.5">Placement matching assistant</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Child selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Child</label>
            <select
              value={selectedChildId}
              onChange={handleChildChange}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {intakeNotes.map(c => (
                <option key={c.id} value={c.id}>{c.childName} — age {c.age}</option>
              ))}
            </select>
          </div>

          {/* Intake note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Intake note</label>
            <textarea
              readOnly value={selectedChild?.note ?? ''} rows={7}
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-600 bg-gray-50 resize-none focus:outline-none leading-relaxed"
            />
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze} disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <><Spinner className="text-white" /> Analyzing…</> : 'Analyze placement needs'}
          </button>

          {/* Toggleable need chips */}
          {allNeeds.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Detected needs — toggle to update scores live
              </p>
              <div className="flex flex-wrap gap-2">
                {allNeeds.map(need => {
                  const on  = activeNeedIds.has(need.id)
                  const cls = need.urgency === 'high'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  return (
                    <button
                      key={need.id}
                      onClick={() => toggleNeed(need.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        on ? cls : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                      }`}
                    >
                      {need.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Red = hard constraint · Yellow = strongly preferred</p>
            </div>
          )}

          {/* Match cards */}
          {!isAnalyzing && rankedMatches.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ranked matches — {rankedMatches.length} homes
              </p>
              {rankedMatches.map(match => {
                const delta = scoreAdjustments[match.id] ?? 0
                return (
                  <MatchCard
                    key={match.id} match={match}
                    adjustedScore={getAdjustedScore(match)} delta={delta}
                    onOpenThread={handleOpenThread}
                    isActive={activeThread?.id === match.id}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{activeThread.familyName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Re: {selectedChild?.childName ?? 'child placement'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(scoreAdjustments[activeThread.id] ?? 0) !== 0 && (
                    <span className={`text-xs font-medium ${(scoreAdjustments[activeThread.id] ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {(scoreAdjustments[activeThread.id] ?? 0) > 0 ? `+${scoreAdjustments[activeThread.id]}` : scoreAdjustments[activeThread.id]}
                    </span>
                  )}
                  <ScoreBadge score={getAdjustedScore(activeThread)} />
                </div>
              </div>
              {/* Auto-detected flags */}
              {convFlags[activeThread.id] && (convFlags[activeThread.id].green.length > 0 || convFlags[activeThread.id].red.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {convFlags[activeThread.id].green.map(f => (
                    <span key={f} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">✓ {f}</span>
                  ))}
                  {convFlags[activeThread.id].red.map(f => (
                    <span key={f} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">✗ {f}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
              {threadMessages.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-8">No messages yet. Start the conversation below.</p>
              )}
              {threadMessages.map(msg => {
                const isWorker = msg.sender === 'worker'
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isWorker ? 'flex-row-reverse' : ''}`}>
                    <Avatar name={msg.name} side={msg.sender} />
                    <div className={`flex flex-col max-w-[68%] ${isWorker ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3.5 py-2 rounded text-sm leading-relaxed ${isWorker ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{msg.timestamp}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 bg-white flex-shrink-0 px-5 py-3 space-y-2">
              <div className="flex gap-2">
                <textarea
                  value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown} rows={2}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
                <div className="flex flex-col gap-1.5">
                  <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors">
                    Send
                  </button>
                  <button onClick={handleDraft} className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-1.5 rounded transition-colors">
                    Draft
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">All messages logged · worker oversight required</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Select a match to open a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
