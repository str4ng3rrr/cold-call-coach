// Note: Direct browser calls to Anthropic API require CORS handling
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, MessageSquare, BookOpen, Briefcase } from 'lucide-react'
import { StorageKeys } from '../lib/storage'
import { HUMANIZER_PROMPT } from '../lib/humanizer'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string
  referencedLessons?: { id: string; title: string }[]
}

interface Lesson {
  id: string
  title: string
  transcript: string
  feedback: string
  createdAt: string
  addedToPlaybook?: boolean
}

interface Offer {
  id: string
  name: string
  description: string
  benefits: string[]
  createdAt: string
}

const STORAGE_KEY = StorageKeys.Chat
const LESSONS_KEY = StorageKeys.Lessons

function loadMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveMessages(messages: Message[]) {
  // Only persist user/assistant messages (not transient error messages)
  const toSave = messages.filter(m => m.role !== 'error')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}

function loadLessons(): Lesson[] {
  try {
    return JSON.parse(localStorage.getItem(LESSONS_KEY) || '[]')
  } catch {
    return []
  }
}

function buildSystemPrompt(activeOffers: Offer[] = []): string {
  const playbook = localStorage.getItem(StorageKeys.Playbook) || ''
  const lessonInstruction = `The user may reference specific lessons from their call history. When lesson data is provided, use it to give specific, contextual coaching advice tied to their real calls.`

  let base: string
  if (playbook.trim()) {
    base = `You are an expert cold calling coach. Here is the user's playbook of best practices:\n\n${playbook}\n\nHelp the user improve their cold calling skills. Reference the playbook when relevant.\n\n${lessonInstruction}`
  } else {
    base = `You are an expert cold calling coach. Help the user improve their cold calling skills with actionable, specific advice.\n\n${lessonInstruction}`
  }

  if (activeOffers.length > 0) {
    let offerContext = `\n\nThe user offers these services — reference them when coaching:\n\n`
    offerContext += activeOffers.map(o =>
      `## ${o.name}\n${o.description}\nBenefits: ${o.benefits.join(', ')}`
    ).join('\n\n')
    base += offerContext
  }

  return base + HUMANIZER_PROMPT
}

function buildLessonContext(lessons: Lesson[], attachedIds: string[]): string {
  if (attachedIds.length === 0) return ''
  return attachedIds
    .map(id => lessons.find(l => l.id === id))
    .filter((l): l is Lesson => !!l)
    .map(
      l =>
        `\n\n---\n[Referenced Lesson: "${l.title}"]\nTranscript:\n${l.transcript}\n\nAI Feedback:\n${l.feedback}\n---\n`
    )
    .join('')
}

async function sendToClaudeApi(messages: Message[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY — add it to your .env file')

  // Filter out error messages before sending to API
  const filtered = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Cache the conversation history up to the last assistant turn.
  // Everything before the current user message is stable and won't change.
  const lastAssistantIdx = filtered.map(m => m.role).lastIndexOf('assistant')
  const apiMessages = filtered.map((msg, i) => {
    if (i === lastAssistantIdx) {
      // Mark the last assistant message as a cache breakpoint.
      // The API caches everything from the start up to and including this block.
      return { role: msg.role, content: [{ type: 'text', text: msg.content, cache_control: { type: 'ephemeral' } }] }
    }
    return msg
  })

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      // Cache the system prompt (playbook + offers). This is the biggest win —
      // the playbook can be large and is identical on every message in a session.
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: apiMessages,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lessons, setLessons] = useState<Lesson[]>(() => loadLessons())
  const [attachedLessonIds, setAttachedLessonIds] = useState<string[]>([])
  const [lessonPanelOpen, setLessonPanelOpen] = useState(false)
  const [offers] = useState<Offer[]>(() => {
    try {
      const raw = localStorage.getItem('ccc_offers')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([])
  const [offerPanelOpen, setOfferPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Reload lessons on mount
  useEffect(() => {
    setLessons(loadLessons())
  }, [])

  // Save to localStorage whenever messages change (excluding error messages)
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggleLesson(id: string) {
    setAttachedLessonIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleOffer(id: string) {
    setSelectedOfferIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    // Build the API content: lesson context prepended before user text
    const lessonContext = buildLessonContext(lessons, attachedLessonIds)
    const apiContent = lessonContext ? `${lessonContext}\n\n${text}` : text

    // Capture which lessons were attached for display in the bubble
    const referencedLessons =
      attachedLessonIds.length > 0
        ? attachedLessonIds
            .map(id => lessons.find(l => l.id === id))
            .filter((l): l is Lesson => !!l)
            .map(l => ({ id: l.id, title: l.title }))
        : undefined

    const userMessage: Message = {
      role: 'user',
      content: apiContent,
      referencedLessons,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setAttachedLessonIds([])
    setLessonPanelOpen(false)
    setLoading(true)

    try {
      const activeOffers = offers.filter(o => selectedOfferIds.includes(o.id))
      const reply = await sendToClaudeApi(nextMessages, buildSystemPrompt(activeOffers))
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setMessages(prev => [
        ...prev,
        { role: 'error', content: `Failed to get a response: ${msg}` },
      ])
    } finally {
      setLoading(false)
      // Restore focus to input after response
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [input, loading, messages, attachedLessonIds, lessons, offers, selectedOfferIds])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleClearChat() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    inputRef.current?.focus()
  }

  const hasMessages = messages.length > 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <MessageSquare size={20} />
          </div>
          <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Coach Chat
          </h1>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: 'var(--text-muted)' }}>
              Ask anything about your cold calling
            </p>
          </div>
        </div>

        {hasMessages && (
          <button
            onClick={handleClearChat}
            title="Clear chat history"
            className="coach-clear-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              color: 'var(--text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Trash2 size={14} />
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {!hasMessages && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '40px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                marginBottom: '20px',
              }}
            >
              <MessageSquare size={32} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: 'var(--text-primary)' }}>
              Welcome to Coach Chat
            </h2>
            <p style={{ fontSize: '14px', margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
              Ask me anything about cold calling. I can help you with scripts, handling objections, or analyzing your calls.
            </p>
          </div>
        )}

        {hasMessages &&
          messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                maxWidth: '80%',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: message.role === 'user' ? '#2563eb' : '#f3f4f6',
                  color: message.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
                className={message.role === 'assistant' ? 'markdown-chat' : ''}
              >
                {message.role === 'assistant' ? (
                  <div className="markdown-chat"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                )}
                
                {message.referencedLessons && message.referencedLessons.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: message.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginBottom: '6px' }}>
                      Referenced Lessons
                    </div>
                    {message.referencedLessons.map(lesson => (
                      <div
                        key={lesson.id}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          backgroundColor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : '#fff',
                          borderRadius: '6px',
                          marginBottom: '4px',
                        }}
                      >
                        {lesson.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

        {loading && (
          <div style={{ display: 'flex', maxWidth: '80%', alignSelf: 'flex-start' }}>
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out 0.2s infinite',
                  }}
                />
                <div
                  style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out 0.4s infinite',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          padding: '16px 24px',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Lesson chips panel */}
          {lessonPanelOpen && lessons.length > 0 && (
            <div
              style={{
                maxHeight: '80px',
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingBottom: '4px',
              }}
            >
              {lessons.map(lesson => {
                const isSelected = attachedLessonIds.includes(lesson.id)
                const label = lesson.title.length > 25 ? lesson.title.slice(0, 25) + '…' : lesson.title
                return (
                  <button
                    key={lesson.id}
                    onClick={() => toggleLesson(lesson.id)}
                    title={lesson.title}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.12s, border-color 0.12s, color 0.12s',
                      backgroundColor: isSelected ? '#dbeafe' : '#fff',
                      color: isSelected ? '#2563eb' : 'var(--text-muted)',
                      border: isSelected ? '1px solid #93c5fd' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {lessonPanelOpen && lessons.length === 0 && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '6px 2px',
              }}
            >
              No lessons saved yet. Analyze a call to create lessons.
            </div>
          )}

          {/* Offer chips panel */}
          {offerPanelOpen && offers.length > 0 && (
            <div
              style={{
                maxHeight: '80px',
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingBottom: '4px',
              }}
            >
              {offers.map(offer => {
                const isSelected = selectedOfferIds.includes(offer.id)
                const label = offer.name.length > 25 ? offer.name.slice(0, 25) + '…' : offer.name
                return (
                  <button
                    key={offer.id}
                    onClick={() => toggleOffer(offer.id)}
                    title={offer.name}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.12s, border-color 0.12s, color 0.12s',
                      backgroundColor: isSelected ? '#dbeafe' : '#fff',
                      color: isSelected ? '#2563eb' : 'var(--text-muted)',
                      border: isSelected ? '1px solid #93c5fd' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {offerPanelOpen && offers.length === 0 && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '6px 2px',
              }}
            >
              No offers configured yet. Add offers in the My Offer page.
            </div>
          )}

          {/* Input row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            {/* Attach Lesson toggle */}
            <button
              onClick={() => setLessonPanelOpen(p => !p)}
              title={lessonPanelOpen ? 'Close lesson panel' : 'Attach a lesson'}
              className="coach-attach-btn"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                borderRadius: '10px',
                border: lessonPanelOpen || attachedLessonIds.length > 0
                  ? '1px solid #93c5fd'
                  : '1px solid var(--border)',
                backgroundColor: lessonPanelOpen || attachedLessonIds.length > 0
                  ? '#dbeafe'
                  : '#fff',
                color: lessonPanelOpen || attachedLessonIds.length > 0
                  ? '#2563eb'
                  : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.12s, border-color 0.12s, color 0.12s',
                height: '40px',
              }}
            >
              <BookOpen size={13} />
              {attachedLessonIds.length > 0 ? `${attachedLessonIds.length} Attached` : 'Attach Lesson'}
            </button>

            {/* Attach Offers toggle */}
            <button
              onClick={() => setOfferPanelOpen(p => !p)}
              title={offerPanelOpen ? 'Close offers panel' : 'Attach offers'}
              className="coach-attach-offers-btn"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                borderRadius: '10px',
                border: offerPanelOpen || selectedOfferIds.length > 0
                  ? '1px solid #93c5fd'
                  : '1px solid var(--border)',
                backgroundColor: offerPanelOpen || selectedOfferIds.length > 0
                  ? '#dbeafe'
                  : '#fff',
                color: offerPanelOpen || selectedOfferIds.length > 0
                  ? '#2563eb'
                  : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.12s, border-color 0.12s, color 0.12s',
                height: '40px',
              }}
            >
              <Briefcase size={13} />
              {selectedOfferIds.length > 0 ? `${selectedOfferIds.length} Offer${selectedOfferIds.length > 1 ? 's' : ''}` : 'Attach Offers'}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask your coach... (Enter to send, Shift+Enter for newline)"
              autoFocus
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontFamily: 'inherit',
                color: 'var(--text-primary)',
                backgroundColor: loading ? '#f9fafb' : '#fff',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.5',
                maxHeight: '140px',
                overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              onInput={e => {
                // Auto-grow textarea
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 140) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              title="Send message"
              className="coach-send-btn"
              style={{
                flexShrink: 0,
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: input.trim() && !loading ? '#3b82f6' : '#d1d5db',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.15s',
                flexDirection: 'column',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }

        .markdown-chat p { margin: 0 0 8px; }
        .markdown-chat p:last-child { margin-bottom: 0; }
        .markdown-chat ul, .markdown-chat ol { margin: 6px 0 8px; padding-left: 20px; }
        .markdown-chat li { margin-bottom: 4px; }
        .markdown-chat h1, .markdown-chat h2, .markdown-chat h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 10px 0 4px;
          color: var(--text-primary);
        }
        .markdown-chat h1:first-child,
        .markdown-chat h2:first-child,
        .markdown-chat h3:first-child { margin-top: 0; }
        .markdown-chat code {
          font-size: 12px;
          background: #e5e7eb;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: ui-monospace, monospace;
        }
        .markdown-chat pre {
          background: #e5e7eb;
          padding: 10px 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .markdown-chat pre code {
          background: none;
          padding: 0;
        }
        .markdown-chat strong { font-weight: 600; }
        .markdown-chat blockquote {
          border-left: 3px solid #d1d5db;
          margin: 8px 0;
          padding-left: 12px;
          color: var(--text-muted);
        }
        .markdown-chat hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 10px 0;
        }
        .coach-clear-btn:hover {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #ef4444 !important;
        }
        .coach-send-btn:hover:not(:disabled) {
          background-color: #2563eb !important;
        }
        .coach-attach-btn:hover {
          background-color: #eff6ff !important;
          border-color: #93c5fd !important;
          color: #2563eb !important;
        }
        .coach-attach-offers-btn:hover {
          background-color: #eff6ff !important;
          border-color: #93c5fd !important;
          color: #2563eb !important;
        }
      `}</style>
    </div>
  )
}
