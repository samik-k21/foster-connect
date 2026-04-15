import { useState, useRef, useEffect } from 'react'
import intakeNotes from './data/intakeNotes.json'
import homeProfiles from './data/homeProfiles.json'

// ---------------------------------------------------------------------------
// Mock seed data
// ---------------------------------------------------------------------------

const MOCK_MATCHES = [
  {
    id: 'H-001',
    familyName: 'Martinez family',
    matchScore: 84,
    needs: [
      { label: 'Halal diet', met: true },
      { label: 'SE district', met: true },
      { label: 'Bilingual', met: true },
      { label: 'Therapy access', met: false },
    ],
    notes: 'Strong cultural fit. Transport offered. Therapy 22 mi — may need coordination.',
    messagingUnlocked: true,
  },
  {
    id: 'H-004',
    familyName: 'Rivera family',
    matchScore: 76,
    needs: [
      { label: 'Halal diet', met: true },
      { label: 'SE district', met: false },
      { label: 'Bilingual', met: true },
      { label: 'Special needs licensed', met: true },
    ],
    notes: 'Licensed, Halal-capable, therapy 8 mi. SW district. No current children.',
    messagingUnlocked: false,
  },
  {
    id: 'H-003',
    familyName: 'Okafor family',
    matchScore: 71,
    needs: [
      { label: 'Halal diet', met: true },
      { label: 'SE district', met: true },
      { label: 'Bilingual (Somali)', met: false },
      { label: 'Therapy access', met: false },
    ],
    notes: "Halal, SE district, Somali-speaking but not Amina's primary language. Therapy 14 mi.",
    messagingUnlocked: false,
  },
  {
    id: 'H-002',
    familyName: 'Chen family',
    matchScore: 52,
    needs: [
      { label: 'Halal diet', met: false },
      { label: 'SE district', met: false },
      { label: 'Pet-free', met: false },
      { label: 'Therapy access', met: true },
    ],
    notes: 'Excellent therapy access and licensed. English only, no Halal diet, dog in home.',
    messagingUnlocked: false,
  },
]

const MOCK_THREAD_MARTINEZ = [
  {
    id: 1,
    sender: 'worker',
    name: 'S. Rawat',
    text: 'Hi — reaching out about a potential placement. 9-year-old girl, bilingual Somali/English, strict Halal diet. I think your home could be a strong cultural fit.',
    timestamp: 'Apr 12 · 2:14 PM',
  },
  {
    id: 2,
    sender: 'family',
    name: 'Martinez',
    text: "Hello! We'd love to learn more. We have experience with bilingual children and already maintain a Halal kitchen.",
    timestamp: 'Apr 12 · 3:02 PM',
  },
  {
    id: 3,
    sender: 'worker',
    name: 'S. Rawat',
    text: 'Great to hear. She has weekly therapy appointments she needs to continue — the nearest provider would be about 22 miles. Would transport be manageable?',
    timestamp: 'Apr 12 · 3:15 PM',
  },
  {
    id: 4,
    sender: 'family',
    name: 'Martinez',
    text: 'We can handle that — we do regular runs in that direction anyway. Happy to support her appointments. When can we schedule a call to discuss next steps?',
    timestamp: 'Apr 12 · 4:30 PM',
  },
]

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-blue-500 flex-shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function ScoreBadge({ score }) {
  const cls =
    score >= 80
      ? 'bg-green-100 text-green-800 border-green-200'
      : score >= 60
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-red-100 text-red-800 border-red-200'
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>
      {score}%
    </span>
  )
}

function NeedBadge({ label, met }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
        met
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {met ? '✓' : '✗'} {label}
    </span>
  )
}

function Avatar({ name, side }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
        side === 'worker' ? 'bg-blue-600' : 'bg-gray-400'
      }`}
    >
      {initials}
    </div>
  )
}

function MatchCard({ match, adjustedScore, delta, onOpenThread, isActive }) {
  return (
    <div
      className={`bg-white border rounded p-4 space-y-2.5 transition-colors ${
        isActive ? 'border-blue-400' : 'border-gray-200'
      }`}
    >
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
        {match.needs.map((n) => (
          <NeedBadge key={n.label} label={n.label} met={n.met} />
        ))}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{match.notes}</p>

      {match.messagingUnlocked && (
        <button
          onClick={() => onOpenThread(match)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:border-blue-400 px-3 py-1 rounded transition-colors"
        >
          Open thread →
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

export default function App() {
  const [selectedChildId, setSelectedChildId] = useState('C-001')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rankedMatches, setRankedMatches] = useState(MOCK_MATCHES)
  const [activeThread, setActiveThread] = useState(MOCK_MATCHES[0])
  const [threadMessages, setThreadMessages] = useState(MOCK_THREAD_MARTINEZ)
  const [inputText, setInputText] = useState('')
  const [isDrafting, setIsDrafting] = useState(false)
  const [childNeeds, setChildNeeds] = useState(null)
  // score adjustments: { [homeId]: number } — tracks cumulative delta per family
  const [scoreAdjustments, setScoreAdjustments] = useState({})

  const getAdjustedScore = (match) => {
    const delta = scoreAdjustments[match.id] ?? 0
    return Math.min(100, Math.max(0, match.matchScore + delta))
  }

  const adjustScore = (homeId, delta) => {
    setScoreAdjustments((prev) => ({
      ...prev,
      [homeId]: (prev[homeId] ?? 0) + delta,
    }))
  }

  const messagesEndRef = useRef(null)

  const selectedChild = intakeNotes.find((c) => c.id === selectedChildId)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages])

  const handleChildChange = (e) => {
    setSelectedChildId(e.target.value)
    setRankedMatches([])
    setActiveThread(null)
    setThreadMessages([])
    setInputText('')
    setScoreAdjustments({})
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setRankedMatches([])
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeNote: selectedChild.note,
          homeProfiles,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const transformed = data.rankedMatches.map(match => ({
        id: match.homeId,
        familyName: match.familyName,
        matchScore: match.matchScore,
        notes: match.notes,
        messagingUnlocked: match.messagingUnlocked,
        needs: [
          ...match.metNeeds.map(label => ({ label, met: true })),
          ...match.unmetNeeds.map(label => ({ label, met: false }))
        ]
      }))
      setChildNeeds(data.childNeeds)
      setRankedMatches(transformed)
    } catch (err) {
      console.error('Match API error:', err)
      // Fall back to mock data so the UI stays useful during dev
      setRankedMatches(MOCK_MATCHES)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleOpenThread = (match) => {
    setActiveThread(match)
    setThreadMessages(match.id === 'H-001' ? MOCK_THREAD_MARTINEZ : [])
    setInputText('')
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!text) return
    const now = new Date()
    setThreadMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'worker',
        name: 'S. Rawat',
        text,
        timestamp: now.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
    ])
    // Each message sent nudges score up by 1, capped at +10 engagement bonus
    if (activeThread) {
      const currentDelta = scoreAdjustments[activeThread.id] ?? 0
      if (currentDelta < 10) {
        adjustScore(activeThread.id, 1)
      }
    }
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAIDraft = async () => {
    setIsDrafting(true)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadMessages,
          childNeeds: childNeeds ?? selectedChild?.note,
          homeName: activeThread?.familyName,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setInputText(data.draft ?? '')
    } catch (err) {
      console.error('Draft API error:', err)
    } finally {
      setIsDrafting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* ------------------------------------------------------------------ */}
      {/* LEFT PANEL                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-[44%] min-w-[340px] flex flex-col border-r border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">FosterConnect</p>
          <p className="text-xs text-gray-400 mt-0.5">Placement matching assistant</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Child selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Child</label>
            <select
              value={selectedChildId}
              onChange={handleChildChange}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {intakeNotes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.childName} — age {c.age}
                </option>
              ))}
            </select>
          </div>

          {/* Intake note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Intake note</label>
            <textarea
              readOnly
              value={selectedChild?.note ?? ''}
              rows={7}
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-600 bg-gray-50 resize-none focus:outline-none leading-relaxed"
            />
          </div>

          {/* Analyze */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            Analyze
          </button>

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
              <Spinner />
              <span>Analyzing placement needs…</span>
            </div>
          )}

          {/* Match cards */}
          {!isAnalyzing && rankedMatches.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ranked matches — {rankedMatches.length} homes
              </p>
              {rankedMatches.map((match) => {
                const delta = scoreAdjustments[match.id] ?? 0
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    adjustedScore={getAdjustedScore(match)}
                    delta={delta}
                    onOpenThread={handleOpenThread}
                    isActive={activeThread?.id === match.id}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT PANEL                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex-shrink-0 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeThread.familyName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Re: {selectedChild?.childName ?? 'child placement'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustScore(activeThread.id, -5)}
                  title="Flag concern"
                  className="text-xs text-red-500 border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
                >
                  − Flag concern
                </button>
                <button
                  onClick={() => adjustScore(activeThread.id, 5)}
                  title="Good fit"
                  className="text-xs text-green-600 border border-green-200 hover:bg-green-50 px-2 py-0.5 rounded transition-colors"
                >
                  + Good fit
                </button>
                <div className="flex items-center gap-1">
                  {(scoreAdjustments[activeThread.id] ?? 0) !== 0 && (
                    <span className={`text-xs font-medium ${(scoreAdjustments[activeThread.id] ?? 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {(scoreAdjustments[activeThread.id] ?? 0) > 0
                        ? `+${scoreAdjustments[activeThread.id]}`
                        : scoreAdjustments[activeThread.id]}
                    </span>
                  )}
                  <ScoreBadge score={getAdjustedScore(activeThread)} />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
              {threadMessages.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-8">
                  No messages yet. Start the conversation below.
                </p>
              )}
              {threadMessages.map((msg) => {
                const isWorker = msg.sender === 'worker'
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${isWorker ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar name={msg.name} side={msg.sender} />
                    <div className={`flex flex-col max-w-[68%] ${isWorker ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3.5 py-2 rounded text-sm leading-relaxed ${
                          isWorker
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
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
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleSend}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={handleAIDraft}
                    disabled={isDrafting}
                    className="border border-gray-300 hover:border-gray-400 disabled:text-gray-400 text-gray-700 text-sm font-medium px-4 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isDrafting ? (
                      <>
                        <Spinner />
                        <span>…</span>
                      </>
                    ) : (
                      'AI Draft'
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">All messages logged · worker oversight required</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Select a match to open a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
