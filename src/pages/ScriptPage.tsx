// Note: Direct browser calls to Anthropic API require CORS handling
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, Plus, Loader2, AlertCircle, RefreshCw, History, X } from 'lucide-react'
import { StorageKeys } from '../lib/storage'
import ReactMarkdown from 'react-markdown'

const SCRIPT_KEY = StorageKeys.Script
const PLAYBOOK_KEY = StorageKeys.Playbook
const SECTIONS_KEY = StorageKeys.PlaybookSections
const CHATS_KEY = StorageKeys.ScriptChats
const VERSIONS_KEY = StorageKeys.ScriptVersions
const API_URL = '/api/anthropic/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_VERSIONS = 20
const SNAPSHOT_INTERVAL_MS = 60_000 // 1 minute minimum between snapshots

interface PlaybookSection {
  id: string
  name: string
  content: string
  createdAt: string
}

interface Offer {
  id: string
  name: string
  description: string
  benefits: string[]
  createdAt: string
}

interface ScriptVersion {
  content: string
  savedAt: string // ISO date
}

function loadScript(): string {
  return localStorage.getItem(SCRIPT_KEY) || ''
}

function saveScript(text: string) {
  localStorage.setItem(SCRIPT_KEY, text)
}

function loadPlaybook(): string {
  return localStorage.getItem(PLAYBOOK_KEY) || ''
}

function loadSections(): PlaybookSection[] {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through
  }
  return []
}

function loadOffers(): Offer[] {
  try {
    const raw = localStorage.getItem('ccc_offers')
    if (raw) return JSON.parse(raw)
  } catch { /* fall through */ }
  return []
}

function loadVersions(): ScriptVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through
  }
  return []
}

function saveVersions(versions: ScriptVersion[]) {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions))
}

function addVersion(content: string) {
  const versions = loadVersions()
  const last = versions[versions.length - 1]
  // Only save if content differs from last saved version
  if (last && last.content === content) return
  const next = [...versions, { content, savedAt: new Date().toISOString() }]
  // FIFO: drop oldest if exceeding max
  const trimmed = next.length > MAX_VERSIONS ? next.slice(next.length - MAX_VERSIONS) : next
  saveVersions(trimmed)
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'error'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

function loadChatSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveChatSessions(sessions: ChatSession[]) {
  // Strip error messages before persisting
  const toSave = sessions.map(s => ({
    ...s,
    messages: s.messages.filter(m => m.role !== 'error'),
  }))
  localStorage.setItem(CHATS_KEY, JSON.stringify(toSave))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function createNewSession(): ChatSession {
  return {
    id: generateId(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
  }
}

function getSessionTitle(session: ChatSession): string {
  const firstUserMsg = session.messages.find(m => m.role === 'user')
  if (!firstUserMsg) return 'New Chat'
  const text = firstUserMsg.content.replace(/\[Selected text from script:.*?\]\n\n/s, '').trim()
  return text.length > 30 ? text.slice(0, 30) + '...' : text || 'New Chat'
}

async function callClaudeChat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY in .env')

  const apiMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => response.statusText)
    throw new Error(`API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const text: string = data?.content?.[0]?.text ?? ''
  if (!text.trim()) throw new Error('Empty response from Claude')
  return text
}

export default function ScriptPage() {
  const [script, setScript] = useState<string>(() => loadScript())
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null)
  const [toast, setToast] = useState<string>('')

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)

  // Sections state
  const [sections, setSections] = useState<PlaybookSection[]>([])
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([])

  // Offers state
  const [offers, setOffers] = useState<Offer[]>([])
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([])
  const [contextPickerOpen, setContextPickerOpen] = useState(false)

  // Version history state
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState<ScriptVersion[]>([])
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const versionsPanelRef = useRef<HTMLDivElement>(null)
  const versionsButtonRef = useRef<HTMLButtonElement>(null)
  const lastSnapshotRef = useRef<number>(0)

  // Chat state — compute initial sessions once
  const [initialSessions] = useState<ChatSession[]>(() => {
    const loaded = loadChatSessions()
    if (loaded.length === 0) {
      const fresh = createNewSession()
      saveChatSessions([fresh])
      return [fresh]
    }
    return loaded
  })
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialSessions)
  const [activeChatId, setActiveChatId] = useState<string>(initialSessions[0].id)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Refresh sections and offers from localStorage when panel opens
  useEffect(() => {
    if (panelOpen) {
      const fresh = loadSections()
      setSections(fresh)
      // Default to all sections selected; preserve existing selection for ids still present
      setSelectedSectionIds(prev => {
        if (prev.length === 0) return fresh.map(s => s.id)
        // Keep only ids that still exist, add any new ones
        const existingIds = new Set(prev)
        const freshIds = fresh.map(s => s.id)
        const kept = freshIds.filter(id => existingIds.has(id))
        const added = freshIds.filter(id => !existingIds.has(id))
        return [...kept, ...added]
      })

      const freshOffers = loadOffers()
      setOffers(freshOffers)
      setSelectedOfferIds(prev => {
        if (prev.length === 0) return freshOffers.map(o => o.id)
        const existingIds = new Set(prev)
        const freshIds = freshOffers.map(o => o.id)
        const kept = freshIds.filter(id => existingIds.has(id))
        const added = freshIds.filter(id => !existingIds.has(id))
        return [...kept, ...added]
      })
    }
  }, [panelOpen])

  // Load versions when history panel opens
  useEffect(() => {
    if (versionsOpen) {
      setVersions(loadVersions())
      setPreviewIndex(null)
    }
  }, [versionsOpen])

  // Click-outside to close version history panel
  useEffect(() => {
    if (!versionsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        versionsPanelRef.current &&
        !versionsPanelRef.current.contains(e.target as Node) &&
        versionsButtonRef.current &&
        !versionsButtonRef.current.contains(e.target as Node)
      ) {
        setVersionsOpen(false)
        setPreviewIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [versionsOpen])

  function toggleSection(id: string) {
    setSelectedSectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleOffer(id: string) {
    setSelectedOfferIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // Auto-save script debounced 500ms + conditional version snapshot
  const handleScriptChange = useCallback((value: string) => {
    setScript(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveScript(value)
      // Check if a snapshot is due (1 minute minimum between snapshots)
      const now = Date.now()
      if (now - lastSnapshotRef.current >= SNAPSHOT_INTERVAL_MS) {
        addVersion(value)
        lastSnapshotRef.current = now
      }
    }, 500)
  }, [])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Track selected text in the textarea
  function handleSelect() {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    if (start !== end) {
      setSelection({ start, end, text: el.value.slice(start, end) })
    } else {
      setSelection(null)
    }
  }

  // Auto-scroll to bottom when messages change or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatSessions, chatLoading, activeChatId])

  const activeSession = chatSessions.find(s => s.id === activeChatId) ?? chatSessions[0]

  function updateActiveSession(updater: (s: ChatSession) => ChatSession) {
    setChatSessions(prev => {
      const next = prev.map(s => (s.id === activeChatId ? updater(s) : s))
      saveChatSessions(next)
      return next
    })
  }

  function handleNewChat() {
    const fresh = createNewSession()
    setChatSessions(prev => {
      const next = [fresh, ...prev]
      saveChatSessions(next)
      return next
    })
    setActiveChatId(fresh.id)
    setChatInput('')
    setTimeout(() => chatInputRef.current?.focus(), 0)
  }

  function handleSwitchChat(id: string) {
    setActiveChatId(id)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50)
  }

  function buildSystemPrompt(): string {
    const currentScript = script

    let prompt = `You are an expert cold calling coach and script writer. Help the user write, improve, and refine their cold call script.`

    // Use sections if available, fall back to combined playbook
    const currentSections = loadSections()
    if (currentSections.length > 0) {
      const activeSections = currentSections.filter(s => selectedSectionIds.includes(s.id) && s.content.trim())
      if (activeSections.length > 0) {
        prompt += `\n\nHere are the selected playbook sections — apply these when giving script advice:\n\n`
        prompt += activeSections.map(s => `## ${s.name}\n${s.content}`).join('\n\n')
      }
    } else {
      // Fallback: no sections stored yet, use combined playbook key
      const playbook = loadPlaybook()
      if (playbook.trim()) {
        prompt += `\n\nHere is the user's playbook of best practices — apply these when giving script advice:\n\n${playbook}`
      }
    }

    const activeOffers = offers.filter(o => selectedOfferIds.includes(o.id))
    if (activeOffers.length > 0) {
      prompt += `\n\nHere are the user's service offerings — use these to tailor script suggestions with relevant benefits and positioning:\n\n`
      prompt += activeOffers.map(o =>
        `## ${o.name}\n${o.description}\n\nKey Benefits:\n${o.benefits.map(b => `- ${b}`).join('\n')}`
      ).join('\n\n')
    }

    if (currentScript.trim()) {
      prompt += `\n\nHere is the user's current script:\n\n${currentScript}`
    } else {
      prompt += `\n\nThe user has not written a script yet — help them get started.`
    }

    prompt += `\n\nWhen suggesting improved script text, write it clearly so the user can easily copy it or use the Replace button to insert it directly into their editor. Be concise and actionable.`

    return prompt
  }

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return

    let userContent = text
    if (selection && selection.text.trim()) {
      const truncated = selection.text.length > 200
        ? selection.text.slice(0, 200) + '...'
        : selection.text
      userContent = `[Selected text from script: "${truncated}"]\n\n${text}`
    }

    const userMessage: ChatMessage = { role: 'user', content: userContent }

    // Build messages for API from current session + new user message
    const currentSession = chatSessions.find(s => s.id === activeChatId)
    const messagesForApi = [...(currentSession?.messages ?? []), userMessage]

    updateActiveSession(s => {
      const updated = { ...s, messages: [...s.messages, userMessage] }
      if (s.messages.filter(m => m.role === 'user').length === 0) {
        updated.title = getSessionTitle(updated)
      }
      return updated
    })

    setChatInput('')
    setChatLoading(true)

    const systemPrompt = buildSystemPrompt()

    try {
      const reply = await callClaudeChat(messagesForApi, systemPrompt)
      const assistantMessage: ChatMessage = { role: 'assistant', content: reply }
      updateActiveSession(s => ({ ...s, messages: [...s.messages, assistantMessage] }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      const errorMessage: ChatMessage = {
        role: 'error',
        content: `Failed to get a response: ${msg}`,
      }
      // Add error to UI state but don't save it (saveChatSessions strips errors)
      setChatSessions(prev =>
        prev.map(s => (s.id === activeChatId ? { ...s, messages: [...s.messages, errorMessage] } : s))
      )
    } finally {
      setChatLoading(false)
      setTimeout(() => chatInputRef.current?.focus(), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInput, chatLoading, selection, activeChatId, script, selectedSectionIds, offers, selectedOfferIds])

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleChatSend()
    }
  }

  function handleReplaceSelection(content: string) {
    if (!selection) return
    const before = script.slice(0, selection.start)
    const after = script.slice(selection.end)
    handleScriptChange(before + content + after)
    setSelection(null)
    showToast('Selection replaced!')
  }

  function handleRestoreVersion(version: ScriptVersion) {
    handleScriptChange(version.content)
    saveScript(version.content)
    setVersionsOpen(false)
    setPreviewIndex(null)
    showToast('Version restored!')
  }

  // The script content shown in the textarea — either a preview or the live script
  const displayedScript = previewIndex !== null && versions[previewIndex] != null
    ? versions[previewIndex].content
    : script

  const hasSelection = selection !== null && selection.text.trim().length > 0
  const messages = activeSession?.messages ?? []

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }} className="script-layout">

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#111827', color: '#fff', padding: '9px 18px',
          borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          zIndex: 100, pointerEvents: 'none',
          animation: 'fadeInUp 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      {/* Left: Script editor */}
      <div
        className="script-editor-pane"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          transition: 'flex 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Script Editor
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                Write and refine your cold call script. Select text to get targeted AI help.
              </p>
            </div>

            {/* Version History button */}
            <button
              ref={versionsButtonRef}
              onClick={() => setVersionsOpen(o => !o)}
              title="Version History"
              className="script-versions-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                border: '1px solid var(--border)',
                backgroundColor: versionsOpen ? '#eff6ff' : '#fff',
                color: versionsOpen ? '#2563eb' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
                marginLeft: '16px',
                marginTop: '2px',
                transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
                borderColor: versionsOpen ? '#bfdbfe' : undefined,
              }}
            >
              <History size={14} />
              History
            </button>
          </div>

          {/* Version History dropdown panel */}
          {versionsOpen && (
            <div
              ref={versionsPanelRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: '28px',
                width: '320px',
                backgroundColor: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '380px',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={13} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Version History
                  </span>
                </div>
                <button
                  onClick={() => { setVersionsOpen(false); setPreviewIndex(null) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  className="script-versions-close-btn"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Preview indicator */}
              {previewIndex !== null && (
                <div style={{
                  padding: '7px 14px',
                  backgroundColor: '#fffbeb',
                  borderBottom: '1px solid #fde68a',
                  fontSize: '11px',
                  color: '#92400e',
                  fontWeight: 500,
                  flexShrink: 0,
                }}>
                  Previewing version — click Restore to apply, or click another version
                </div>
              )}

              {/* Version list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {versions.length === 0 ? (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                  }}>
                    No versions saved yet. Versions are captured automatically as you write.
                  </div>
                ) : (
                  // Show newest first
                  [...versions].reverse().map((v, reversedIdx) => {
                    const originalIdx = versions.length - 1 - reversedIdx
                    const isNewest = reversedIdx === 0
                    const isPreviewing = previewIndex === originalIdx
                    return (
                      <div
                        key={originalIdx}
                        onClick={() => setPreviewIndex(isPreviewing ? null : originalIdx)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          backgroundColor: isPreviewing ? '#eff6ff' : 'transparent',
                          transition: 'background-color 0.1s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                        className="script-version-row"
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {timeAgo(v.savedAt)}
                            </span>
                            {isNewest && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '99px',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                lineHeight: '1.6',
                              }}>
                                Current
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {v.content.length.toLocaleString()} chars
                          </span>
                        </div>

                        {isPreviewing && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRestoreVersion(v) }}
                            style={{
                              flexShrink: 0,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #93c5fd',
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'background-color 0.12s',
                              whiteSpace: 'nowrap',
                            }}
                            className="script-version-restore-btn"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={displayedScript}
            onChange={e => {
              // If previewing, escape preview on edit and apply change to live script
              if (previewIndex !== null) setPreviewIndex(null)
              handleScriptChange(e.target.value)
            }}
            onSelect={handleSelect}
            onMouseUp={handleSelect}
            onKeyUp={handleSelect}
            placeholder={'Write your cold call script here...\n\nExample:\n"Hi [Name], this is [Your Name] from [Company]. I\'m reaching out because..."\n\nSelect any portion of text and open the AI assistant to get targeted improvements.'}
            style={{
              flex: 1,
              width: '100%',
              padding: '16px',
              fontSize: '14px',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              lineHeight: '1.7',
              border: previewIndex !== null ? '1px solid #fde68a' : '1px solid var(--border)',
              borderRadius: '8px',
              resize: 'none',
              color: 'var(--text-primary)',
              backgroundColor: previewIndex !== null ? '#fffef5' : '#fafafa',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Selection indicator */}
          {hasSelection && (
            <div style={{
              marginTop: '8px',
              padding: '6px 10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#2563eb',
              flexShrink: 0,
            }}>
              {selection!.text.length} characters selected
            </div>
          )}
        </div>

        {/* Toggle handle — always visible on the right edge of the editor */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          title={panelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          className="script-panel-handle"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px 0 0 8px',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '-2px 0 8px rgba(0,0,0,0.12)',
            transition: 'background-color 0.15s',
          }}
        >
          {panelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Right: AI Script Assistant panel */}
      <div
        className="script-ai-pane"
        style={{
          flex: panelOpen ? '0 0 380px' : '0 0 0px',
          width: panelOpen ? '380px' : '0px',
          overflow: 'hidden',
          borderLeft: panelOpen ? '1px solid var(--border)' : 'none',
          backgroundColor: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'flex 0.3s ease, width 0.3s ease',
        }}
      >
        {/* Inner container prevents content from being visible during collapse */}
        <div style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}>

          {/* Panel header */}
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <MessageSquare size={15} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  AI Script Assistant
                </span>
              </div>
              <button
                onClick={handleNewChat}
                title="New chat"
                className="script-newchat-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#fff',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.12s',
                }}
              >
                <Plus size={12} />
                New Chat
              </button>
            </div>

            {/* Chat switcher */}
            {chatSessions.length > 1 && (
              <select
                value={activeChatId}
                onChange={e => handleSwitchChat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#fff',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {chatSessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {getSessionTitle(s)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Context picker (collapsible) */}
          {(sections.length > 0 || offers.length > 0) && (
            <div style={{
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setContextPickerOpen(p => !p)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  transition: 'color 0.15s',
                }}
              >
                <span>Context</span>
                {(selectedSectionIds.length > 0 || selectedOfferIds.length > 0) && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '99px',
                    backgroundColor: '#dbeafe',
                    color: '#2563eb',
                  }}>
                    {selectedSectionIds.length + selectedOfferIds.length}
                  </span>
                )}
                <ChevronDown
                  size={14}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: contextPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {contextPickerOpen && (
                <div style={{
                  padding: '4px 12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {sections.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        paddingTop: '4px',
                        flexShrink: 0,
                      }}>
                        Playbook:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {sections.map(section => {
                          const active = selectedSectionIds.includes(section.id)
                          return (
                            <button
                              key={section.id}
                              onClick={() => toggleSection(section.id)}
                              title={active ? `Remove "${section.name}" from context` : `Add "${section.name}" to context`}
                              style={{
                                padding: '3px 10px',
                                borderRadius: '99px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                border: active ? '1px solid #93c5fd' : '1px solid var(--border)',
                                backgroundColor: active ? '#dbeafe' : '#fff',
                                color: active ? '#2563eb' : 'var(--text-muted)',
                                transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
                                lineHeight: '1.4',
                              }}
                            >
                              {section.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {offers.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        paddingTop: '4px',
                        flexShrink: 0,
                      }}>
                        Offers:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {offers.map(offer => {
                          const active = selectedOfferIds.includes(offer.id)
                          return (
                            <button
                              key={offer.id}
                              onClick={() => toggleOffer(offer.id)}
                              title={active ? `Remove "${offer.name}" from context` : `Add "${offer.name}" to context`}
                              style={{
                                padding: '3px 10px',
                                borderRadius: '99px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                border: active ? '1px solid #93c5fd' : '1px solid var(--border)',
                                backgroundColor: active ? '#dbeafe' : '#fff',
                                color: active ? '#2563eb' : 'var(--text-muted)',
                                transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
                                lineHeight: '1.4',
                              }}
                            >
                              {offer.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected text card */}
          {hasSelection && (
            <div style={{
              margin: '10px 12px 0',
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '7px',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selected Text:
              </div>
              <div style={{ fontSize: '12px', color: '#1d4ed8', fontStyle: 'italic', lineHeight: '1.5', wordBreak: 'break-word' }}>
                {selection!.text.length > 200
                  ? selection!.text.slice(0, 200) + '...'
                  : selection!.text}
              </div>
            </div>
          )}

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>

            {/* Empty state */}
            {messages.length === 0 && !chatLoading && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '40px 16px',
              }}>
                <MessageSquare size={34} style={{ marginBottom: '12px', opacity: 0.25 }} />
                <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Ask me about your script!
                </p>
                <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                  Select text to get AI help, or ask for general recommendations
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => {
              if (msg.role === 'error') {
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: 'center',
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '7px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '7px',
                    }}
                  >
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px', color: '#dc2626' }} />
                    <span style={{ fontSize: '12px', color: '#dc2626', lineHeight: 1.5 }}>
                      {msg.content}
                    </span>
                  </div>
                )
              }

              const isUser = msg.role === 'user'

              // Strip the "[Selected text from script: ...]" prefix for display
              const displayContent = isUser
                ? msg.content.replace(/^\[Selected text from script:.*?\]\n\n/s, '').trim()
                : msg.content

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '90%',
                      padding: '9px 12px',
                      borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      backgroundColor: isUser ? '#3b82f6' : '#f3f4f6',
                      color: isUser ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {isUser ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</span>
                    ) : (
                      <div className="markdown-script-chat">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Replace button for assistant messages */}
                  {!isUser && (
                    <button
                      onClick={() => handleReplaceSelection(msg.content)}
                      disabled={!hasSelection}
                      title={hasSelection ? 'Replace selected text with this response' : 'Select text in the editor first'}
                      className="script-replace-btn"
                      style={{
                        marginTop: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 9px',
                        borderRadius: '5px',
                        border: '1px solid var(--border)',
                        backgroundColor: hasSelection ? '#fff' : '#f9fafb',
                        color: hasSelection ? '#374151' : '#9ca3af',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: hasSelection ? 'pointer' : 'not-allowed',
                        transition: 'background-color 0.12s',
                      }}
                    >
                      <RefreshCw size={10} />
                      Replace Selection
                    </button>
                  )}
                </div>
              )
            })}

            {/* Typing indicator */}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <span style={{
                    display: 'inline-block', width: '7px', height: '7px',
                    borderRadius: '50%', backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out 0s infinite',
                  }} />
                  <span style={{
                    display: 'inline-block', width: '7px', height: '7px',
                    borderRadius: '50%', backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out 0.2s infinite',
                  }} />
                  <span style={{
                    display: 'inline-block', width: '7px', height: '7px',
                    borderRadius: '50%', backgroundColor: '#9ca3af',
                    animation: 'bounce 1.2s ease-in-out 0.4s infinite',
                  }} />
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            padding: '12px',
            backgroundColor: 'var(--sidebar-bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={chatLoading}
                placeholder="Ask the AI coach..."
                rows={1}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '9px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  backgroundColor: chatLoading ? '#f9fafb' : '#fff',
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
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 140) + 'px'
                }}
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
                title="Send message"
                className="script-send-btn"
                style={{
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: chatInput.trim() && !chatLoading ? '#3b82f6' : '#d1d5db',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s',
                }}
              >
                {chatLoading ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            
           
            
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }

        .script-panel-handle:hover {
          background-color: #2563eb !important;
        }
        .script-send-btn:hover:not(:disabled) {
          background-color: #2563eb !important;
        }
        .script-newchat-btn:hover {
          background-color: #f3f4f6 !important;
        }
        .script-replace-btn:hover:not(:disabled) {
          background-color: #f3f4f6 !important;
        }
        .script-versions-btn:hover {
          background-color: #eff6ff !important;
          color: #2563eb !important;
          border-color: #bfdbfe !important;
        }
        .script-versions-close-btn:hover {
          background-color: #f3f4f6 !important;
          color: #374151 !important;
        }
        .script-version-row:hover {
          background-color: #f9fafb !important;
        }
        .script-version-restore-btn:hover {
          background-color: #bfdbfe !important;
        }

        .markdown-script-chat p { margin: 0 0 6px; }
        .markdown-script-chat p:last-child { margin-bottom: 0; }
        .markdown-script-chat ul, .markdown-script-chat ol { margin: 5px 0 6px; padding-left: 18px; }
        .markdown-script-chat li { margin-bottom: 3px; }
        .markdown-script-chat h1, .markdown-script-chat h2, .markdown-script-chat h3 {
          font-size: 13px;
          font-weight: 600;
          margin: 8px 0 3px;
          color: var(--text-primary);
        }
        .markdown-script-chat h1:first-child,
        .markdown-script-chat h2:first-child,
        .markdown-script-chat h3:first-child { margin-top: 0; }
        .markdown-script-chat code {
          font-size: 11px;
          background: #e5e7eb;
          padding: 1px 4px;
          border-radius: 3px;
          font-family: ui-monospace, monospace;
        }
        .markdown-script-chat pre {
          background: #e5e7eb;
          padding: 8px 10px;
          border-radius: 5px;
          overflow-x: auto;
          margin: 6px 0;
        }
        .markdown-script-chat pre code {
          background: none;
          padding: 0;
        }
        .markdown-script-chat strong { font-weight: 600; }
        .markdown-script-chat blockquote {
          border-left: 3px solid #d1d5db;
          margin: 6px 0;
          padding-left: 10px;
          color: var(--text-muted);
        }
        .markdown-script-chat hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 8px 0;
        }

        @media (max-width: 768px) {
          .script-layout {
            flex-direction: column !important;
            overflow: auto !important;
          }
          .script-editor-pane {
            flex: none !important;
            min-height: 320px;
            height: 45vh;
            border-bottom: 1px solid var(--border);
            overflow: hidden;
          }
          .script-ai-pane {
            flex: none !important;
            width: 100% !important;
            height: auto !important;
            min-height: 320px;
            border-left: none !important;
            overflow: visible !important;
          }
          .script-ai-pane > div {
            width: 100% !important;
          }
          .script-panel-handle {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
