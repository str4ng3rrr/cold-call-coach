import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { BookOpen, Edit3, Save, AlertCircle, PlusCircle, CheckCircle, Loader2, ListPlus, X, Check, Trash2, ChevronDown, Square } from 'lucide-react'
import { StorageKeys } from '../lib/storage'

interface Lesson {
  id: string
  title: string
  transcript: string
  feedback: string
  createdAt: string
  addedToPlaybook: boolean
}

interface PlaybookSection {
  id: string
  name: string
  content: string
  createdAt: string
}

const PLAYBOOK_KEY = StorageKeys.Playbook
const SECTIONS_KEY = StorageKeys.PlaybookSections
const LESSONS_KEY = StorageKeys.Lessons
const API_URL = '/api/anthropic/v1/messages'
const MODEL = 'claude-sonnet-4-6'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function computeCombinedPlaybook(sections: PlaybookSection[]): string {
  return sections
    .filter(s => s.content.trim())
    .map(s => `## ${s.name}\n\n${s.content}`)
    .join('\n\n---\n\n')
}

function syncCombinedPlaybook(sections: PlaybookSection[]) {
  localStorage.setItem(PLAYBOOK_KEY, computeCombinedPlaybook(sections))
}

function loadSections(): PlaybookSection[] {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to migration
  }
  return []
}

function saveSections(sections: PlaybookSection[]) {
  localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections))
}

function migrateIfNeeded(): PlaybookSection[] {
  const existing = loadSections()
  if (existing.length > 0) return existing

  // Migration: check for old single-playbook key
  const oldContent = localStorage.getItem(PLAYBOOK_KEY) || ''
  const initial: PlaybookSection = {
    id: generateId(),
    name: 'Lessons Playbook',
    content: oldContent,
    createdAt: new Date().toISOString(),
  }
  saveSections([initial])
  syncCombinedPlaybook([initial])
  return [initial]
}

function loadLessons(): Lesson[] {
  try {
    return JSON.parse(localStorage.getItem(LESSONS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLessons(lessons: Lesson[]) {
  localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function PlaybookPage() {
  const [sections, setSections] = useState<PlaybookSection[]>(() => migrateIfNeeded())
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const s = migrateIfNeeded()
    return s[0]?.id ?? ''
  })
  const activeSectionIdRef = useRef(activeSectionId)
  useEffect(() => { activeSectionIdRef.current = activeSectionId }, [activeSectionId])

  const activeSection = sections.find(s => s.id === activeSectionId) ?? sections[0]

  const [draftContent, setDraftContent] = useState<string>(() => activeSection?.content ?? '')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [lessons, setLessons] = useState<Lesson[]>(() => loadLessons())

  // Section management UI state
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [isRenamingSection, setIsRenamingSection] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Single-add state
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Bulk-add state
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({})
  const bulkCancelRef = useRef(false)

  // Toast state
  const [toast, setToast] = useState<string>('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const newSectionInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

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

  // Sync lessons from localStorage when component mounts
  useEffect(() => {
    setLessons(loadLessons())
  }, [])

  // When active section changes, update draft content to match new section
  useEffect(() => {
    const section = sections.find(s => s.id === activeSectionId)
    setDraftContent(section?.content ?? '')
  }, [activeSectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus new section input when it appears
  useEffect(() => {
    if (isAddingSection) {
      setTimeout(() => newSectionInputRef.current?.focus(), 0)
    }
  }, [isAddingSection])

  // Auto-focus rename input when it appears
  useEffect(() => {
    if (isRenamingSection) {
      setTimeout(() => renameInputRef.current?.focus(), 0)
    }
  }, [isRenamingSection])

  // Auto-save draft on edit, debounced 500ms
  const handleDraftChange = useCallback((value: string) => {
    setDraftContent(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const sectionId = activeSectionIdRef.current
      setSections(prev => {
        const updated = prev.map(s => s.id === sectionId ? { ...s, content: value } : s)
        saveSections(updated)
        syncCombinedPlaybook(updated)
        return updated
      })
    }, 500)
  }, [])

  function flushDraft(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const sectionId = activeSectionIdRef.current
    setSections(prev => {
      const updated = prev.map(s => s.id === sectionId ? { ...s, content: value } : s)
      saveSections(updated)
      syncCombinedPlaybook(updated)
      return updated
    })
  }

  function handleSaveAndSwitch() {
    flushDraft(draftContent)
    setMode('view')
    showToast('Playbook saved!')
  }

  function handleEditClick() {
    setDraftContent(activeSection?.content ?? '')
    setMode('edit')
  }

  // --- Section management ---

  function handleSelectSection(id: string) {
    if (id === activeSectionId) return
    // Flush any pending draft for current section
    if (mode === 'edit') {
      flushDraft(draftContent)
    }
    setMode('view')
    setActiveSectionId(id)
    setIsAddingSection(false)
    setDeleteConfirmId(null)
  }

  function handleStartAddSection() {
    setIsAddingSection(true)
    setNewSectionName('')
  }

  function handleConfirmAddSection() {
    const name = newSectionName.trim()
    if (!name) {
      setIsAddingSection(false)
      return
    }
    const newSection: PlaybookSection = {
      id: generateId(),
      name,
      content: '',
      createdAt: new Date().toISOString(),
    }
    const updated = [...sections, newSection]
    saveSections(updated)
    syncCombinedPlaybook(updated)
    setSections(updated)
    setActiveSectionId(newSection.id)
    setIsAddingSection(false)
    setNewSectionName('')
    setMode('view')
  }

  function handleCancelAddSection() {
    setIsAddingSection(false)
    setNewSectionName('')
  }

  function handleStartRename() {
    setRenameDraft(activeSection?.name ?? '')
    setIsRenamingSection(true)
  }

  function handleConfirmRename() {
    const name = renameDraft.trim()
    if (!name) {
      setIsRenamingSection(false)
      return
    }
    const updated = sections.map(s =>
      s.id === activeSectionId ? { ...s, name } : s
    )
    saveSections(updated)
    syncCombinedPlaybook(updated)
    setSections(updated)
    setIsRenamingSection(false)
  }

  function handleCancelRename() {
    setIsRenamingSection(false)
  }

  function handleDeleteSection(id: string) {
    if (sections.length <= 1) return
    const updated = sections.filter(s => s.id !== id)
    saveSections(updated)
    syncCombinedPlaybook(updated)
    setSections(updated)
    // Switch to first remaining section if we deleted the active one
    if (activeSectionId === id) {
      setActiveSectionId(updated[0].id)
    }
    setDeleteConfirmId(null)
    showToast('Section deleted.')
  }

  /**
   * Core API logic: reads fresh active section content from localStorage,
   * calls Claude, saves result to that section, marks lesson as added.
   * Does NOT touch any loading/error UI state — callers handle that.
   * Accepts an optional targetSectionId; falls back to activeSectionIdRef.current.
   */
  async function addLessonCore(lesson: Lesson, targetSectionId?: string): Promise<Lesson[]> {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_ANTHROPIC_API_KEY in .env')
    }

    // Always re-read from localStorage for freshness (sequential calls see each other's writes)
    const sectionId = targetSectionId ?? activeSectionIdRef.current
    const freshSections = loadSections()
    const targetSection = freshSections.find(s => s.id === sectionId)
    const currentContent = targetSection?.content ?? ''
    const sectionName = targetSection?.name ?? 'Playbook'

    const userMessage = `Here is the current playbook section "${sectionName}" (may be empty):
<playbook>
${currentContent || '(empty — this will be the first entry)'}
</playbook>

Here is a cold call lesson to incorporate:
<lesson_title>${lesson.title}</lesson_title>
<lesson_transcript>${lesson.transcript}</lesson_transcript>
<lesson_feedback>${lesson.feedback || '(no AI feedback yet)'}</lesson_feedback>

Please return the full updated playbook section in markdown. Append any new insights or rules derived from this lesson. Tag the new content with an HTML comment on a new line at the end of each new section: <!-- source: ${lesson.id} -->

Return ONLY the markdown content of the full updated playbook section. Do not include any preamble or explanation outside the markdown.`

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
        max_tokens: 4096,
        system: 'You are a cold calling coach building a best-practices playbook. You can only ADD or EDIT rules — NEVER remove existing content.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`API error ${response.status}: ${errBody}`)
    }

    const data = await response.json()
    const updatedContent: string = data?.content?.[0]?.text ?? ''

    if (!updatedContent.trim()) {
      throw new Error('Empty response from Claude API')
    }

    // Update the specific section with new content
    const newSections = freshSections.map(s =>
      s.id === sectionId ? { ...s, content: updatedContent } : s
    )
    saveSections(newSections)
    syncCombinedPlaybook(newSections)
    setSections(newSections)
    // If this is still the active section, update draft too
    if (sectionId === activeSectionIdRef.current) {
      setDraftContent(updatedContent)
    }

    // Mark lesson as added — re-read lessons from localStorage for freshness
    const freshLessons = loadLessons()
    const updatedLessons = freshLessons.map(l =>
      l.id === lesson.id ? { ...l, addedToPlaybook: true } : l
    )
    saveLessons(updatedLessons)
    setLessons(updatedLessons)

    return updatedLessons
  }

  async function handleAddToPlaybook(lesson: Lesson, targetSectionId?: string) {
    setLoadingId(lesson.id)
    setErrorId(null)
    setErrorMsg('')

    try {
      await addLessonCore(lesson, targetSectionId)
      showToast('Added to playbook!')
    } catch (err) {
      setErrorId(lesson.id)
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleBulkAdd() {
    const toProcess = loadLessons().filter(l => !l.addedToPlaybook)
    if (toProcess.length === 0) return

    bulkCancelRef.current = false
    setBulkProcessing(true)
    setBulkErrors({})
    setBulkProgress({ current: 0, total: toProcess.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < toProcess.length; i++) {
      if (bulkCancelRef.current) break

      const lesson = toProcess[i]
      setBulkProgress({ current: i + 1, total: toProcess.length })
      setProcessingId(lesson.id)

      try {
        await addLessonCore(lesson)
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setBulkErrors(prev => ({ ...prev, [lesson.id]: msg }))
        failCount++
      }

      if (i < toProcess.length - 1 && !bulkCancelRef.current) {
        await delay(2000)
      }
    }

    const wasCancelled = bulkCancelRef.current
    bulkCancelRef.current = false
    setProcessingId(null)
    setBulkProcessing(false)
    setBulkProgress(null)

    if (wasCancelled) {
      showToast(`Cancelled: added ${successCount} of ${toProcess.length}${failCount > 0 ? `, ${failCount} failed` : ''}`)
    } else {
      showToast(`Added ${successCount} of ${toProcess.length}${failCount > 0 ? `, ${failCount} failed` : ''}`)
    }
  }

  const unadded = lessons.filter(l => !l.addedToPlaybook)
  const added = lessons.filter(l => l.addedToPlaybook)
  const activeSectionContent = activeSection?.content ?? ''

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }} className="playbook-layout">

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#111827', color: '#fff', padding: '9px 18px',
          borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          zIndex: 100, pointerEvents: 'none',
          animation: 'toastFadeIn 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      {/* Main playbook area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="playbook-main">

        {/* Header */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Playbook</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              Your living best-practices document
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {mode === 'view' ? (
              <button
                onClick={handleEditClick}
                className="playbook-edit-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '6px',
                  border: '1px solid var(--border)', backgroundColor: '#fff',
                  color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                  transition: 'background-color 0.12s',
                }}
              >
                <Edit3 size={14} />
                Edit
              </button>
            ) : (
              <button
                onClick={handleSaveAndSwitch}
                className="playbook-save-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '6px', border: 'none',
                  backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px',
                  fontWeight: 500, cursor: 'pointer',
                  transition: 'background-color 0.12s',
                }}
              >
                <Save size={14} />
                Save
              </button>
            )}
          </div>
        </div>

        {/* Section tabs */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          backgroundColor: '#fff',
          flexShrink: 0,
          overflowX: 'auto',
          gap: '0',
        }}>
          {sections.map(section => {
            const isActive = section.id === activeSectionId
            return (
              <button
                key={section.id}
                onClick={() => handleSelectSection(section.id)}
                className={`playbook-tab${isActive ? ' playbook-tab-active' : ''}`}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#3b82f6' : 'var(--text-muted)',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.12s, border-color 0.12s',
                  marginBottom: '-1px',
                }}
              >
                {section.name}
              </button>
            )
          })}

          {/* Add section: inline input or + button */}
          {isAddingSection ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px' }}>
              <input
                ref={newSectionInputRef}
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleConfirmAddSection()
                  if (e.key === 'Escape') handleCancelAddSection()
                }}
                placeholder="Section name"
                style={{
                  fontSize: '13px',
                  padding: '3px 7px',
                  borderRadius: '4px',
                  border: '1px solid #3b82f6',
                  outline: 'none',
                  width: '140px',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleConfirmAddSection}
                title="Confirm"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px', borderRadius: '4px',
                  border: 'none', backgroundColor: '#3b82f6', color: '#fff',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleCancelAddSection}
                title="Cancel"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px', borderRadius: '4px',
                  border: '1px solid var(--border)', backgroundColor: '#fff', color: 'var(--text-muted)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartAddSection}
              className="playbook-tab-add"
              title="Add new section"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 12px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                border: 'none',
                borderBottom: '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'color 0.12s',
                marginBottom: '-1px',
                flexShrink: 0,
              }}
            >
              <PlusCircle size={15} />
            </button>
          )}
        </div>

        {/* Section header: name + delete */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 28px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          backgroundColor: '#fafafa',
          minHeight: '44px',
        }}>
          {/* Section name (editable) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRenamingSection ? (
              <>
                <input
                  ref={renameInputRef}
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConfirmRename()
                    if (e.key === 'Escape') handleCancelRename()
                  }}
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '3px 7px',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    minWidth: '120px',
                  }}
                />
                <button
                  onClick={handleConfirmRename}
                  title="Save name"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '22px', height: '22px', borderRadius: '4px',
                    border: 'none', backgroundColor: '#3b82f6', color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Check size={11} />
                </button>
                <button
                  onClick={handleCancelRename}
                  title="Cancel"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '22px', height: '22px', borderRadius: '4px',
                    border: '1px solid var(--border)', backgroundColor: '#fff', color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={11} />
                </button>
              </>
            ) : (
              <button
                onClick={handleStartRename}
                title="Click to rename section"
                className="playbook-section-name-btn"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.12s',
                }}
              >
                {activeSection?.name ?? ''}
              </button>
            )}
          </div>

          {/* Delete section */}
          {sections.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {deleteConfirmId === activeSectionId ? (
                <>
                  <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>Delete this section?</span>
                  <button
                    onClick={() => handleDeleteSection(activeSectionId)}
                    style={{
                      fontSize: '12px', fontWeight: 600,
                      padding: '3px 8px', borderRadius: '4px',
                      border: 'none', backgroundColor: '#dc2626', color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    style={{
                      fontSize: '12px', fontWeight: 500,
                      padding: '3px 8px', borderRadius: '4px',
                      border: '1px solid var(--border)', backgroundColor: '#fff', color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(activeSectionId)}
                  className="playbook-delete-btn"
                  title="Delete this section"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 500,
                    padding: '4px 8px', borderRadius: '4px',
                    border: '1px solid var(--border)', backgroundColor: '#fff',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'color 0.12s, border-color 0.12s',
                  }}
                >
                  <Trash2 size={12} />
                  Delete Section
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          {mode === 'view' ? (
            activeSectionContent.trim() ? (
              <div
                style={{
                  maxWidth: '720px',
                  fontSize: '15px',
                  lineHeight: '1.7',
                  color: 'var(--text-primary)',
                }}
                className="playbook-markdown"
              >
                <ReactMarkdown>{activeSectionContent}</ReactMarkdown>
              </div>
            ) : sections.length === 0 ? (
              // Edge case: no sections at all
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ marginBottom: '14px', opacity: 0.35 }} />
                <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No sections yet</p>
                <p style={{ fontSize: '13px', margin: '0 0 20px' }}>
                  Create your first section to start building your playbook.
                </p>
                <button
                  onClick={handleStartAddSection}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', borderRadius: '6px',
                    border: 'none', backgroundColor: '#3b82f6', color: '#fff',
                    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    transition: 'background-color 0.12s',
                  }}
                  className="playbook-cta-btn"
                >
                  <PlusCircle size={14} />
                  Create your first section
                </button>
              </div>
            ) : (
              // Section exists but is empty
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ marginBottom: '14px', opacity: 0.35 }} />
                <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>This section is empty</p>
                <p style={{ fontSize: '13px', margin: '0 0 20px' }}>
                  Add lessons from the sidebar to build this section,
                  or start writing it manually.
                </p>
                <button
                  onClick={handleEditClick}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', borderRadius: '6px',
                    border: 'none', backgroundColor: '#3b82f6', color: '#fff',
                    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    transition: 'background-color 0.12s',
                  }}
                  className="playbook-cta-btn"
                >
                  <Edit3 size={14} />
                  Start writing
                </button>
              </div>
            )
          ) : (
            <textarea
              value={draftContent}
              onChange={e => handleDraftChange(e.target.value)}
              placeholder={'# My Cold Call Playbook\n\nStart writing your best practices here, or add lessons from the sidebar...'}
              autoFocus
              style={{
                width: '100%',
                minHeight: '500px',
                height: 'calc(100vh - 260px)',
                padding: '16px',
                fontSize: '14px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: '1.6',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                resize: 'vertical',
                color: 'var(--text-primary)',
                backgroundColor: '#fafafa',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>

      {/* Sidebar: lessons */}
      <div
        className="playbook-lesson-sidebar"
        style={{
          width: '300px',
          flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          backgroundColor: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Lessons
            </h2>
            {unadded.length > 0 && (
              <button
                onClick={handleBulkAdd}
                disabled={bulkProcessing || loadingId !== null}
                title="Add all unadded lessons to playbook"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: '1px solid var(--border)',
                  backgroundColor: bulkProcessing ? '#eff6ff' : '#fff',
                  color: bulkProcessing ? '#3b82f6' : 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: bulkProcessing || loadingId !== null ? 'not-allowed' : 'pointer',
                  opacity: loadingId !== null ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {bulkProcessing ? (
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ListPlus size={11} />
                )}
                Add All
              </button>
            )}
          </div>

          {/* Progress indicator */}
          {bulkProcessing && bulkProgress ? (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>
                  Processing {bulkProgress.current} of {bulkProgress.total}...
                </p>
                <button
                  onClick={() => { bulkCancelRef.current = true }}
                  title="Cancel bulk add"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Square size={9} />
                  Cancel
                </button>
              </div>
              {/* Progress bar */}
              <div style={{
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#e5e7eb',
                overflow: 'hidden',
                marginBottom: '4px',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: '3px',
                  backgroundColor: '#3b82f6',
                  width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                ~{(bulkProgress.total - bulkProgress.current) * 2}s remaining
              </p>
            </div>
          ) : (
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {unadded.length} unadded · {added.length} in playbook
            </p>
          )}
          {/* Active section indicator */}
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Adding to: <strong style={{ fontStyle: 'normal', fontWeight: 600 }}>{activeSection?.name ?? ''}</strong>
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {lessons.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px', margin: 0 }}>No lessons yet.</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Add lessons on the Lessons page.</p>
            </div>
          )}

          {/* Unadded lessons first */}
          {unadded.map(lesson => (
            <LessonSidebarCard
              key={lesson.id}
              lesson={lesson}
              sections={sections}
              activeSectionId={activeSectionId}
              isLoading={loadingId === lesson.id}
              hasError={errorId === lesson.id || lesson.id in bulkErrors}
              errorMsg={
                errorId === lesson.id
                  ? errorMsg
                  : bulkErrors[lesson.id] ?? ''
              }
              isProcessing={processingId === lesson.id}
              isBulkRunning={bulkProcessing}
              onAdd={(targetSectionId) => handleAddToPlaybook(lesson, targetSectionId)}
            />
          ))}

          {/* Added lessons */}
          {added.length > 0 && (
            <>
              {unadded.length > 0 && (
                <div style={{
                  margin: '12px 0 8px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Already Added
                </div>
              )}
              {added.map(lesson => (
                <LessonSidebarCard
                  key={lesson.id}
                  lesson={lesson}
                  sections={sections}
                  activeSectionId={activeSectionId}
                  isLoading={false}
                  hasError={false}
                  errorMsg=""
                  isProcessing={false}
                  isBulkRunning={false}
                  onAdd={() => {}}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <style>{`
        .playbook-markdown h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); }
        .playbook-markdown h2 { font-size: 18px; font-weight: 600; margin: 28px 0 12px; color: var(--text-primary); }
        .playbook-markdown h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: var(--text-primary); }
        .playbook-markdown p { margin: 0 0 12px; }
        .playbook-markdown ul, .playbook-markdown ol { margin: 0 0 12px; padding-left: 22px; }
        .playbook-markdown li { margin-bottom: 4px; }
        .playbook-markdown strong { font-weight: 600; }
        .playbook-markdown em { font-style: italic; }
        .playbook-markdown code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
        .playbook-markdown hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
        .playbook-markdown blockquote { border-left: 3px solid var(--border); margin: 0 0 12px; padding-left: 14px; color: var(--text-muted); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .playbook-edit-btn:hover { background-color: #f3f4f6 !important; }
        .playbook-save-btn:hover { background-color: #2563eb !important; }
        .playbook-tab:hover { color: var(--text-primary) !important; }
        .playbook-tab-add:hover { color: var(--text-primary) !important; }
        .playbook-section-name-btn:hover { background-color: #f3f4f6 !important; }
        .playbook-delete-btn:hover { color: #dc2626 !important; border-color: #fca5a5 !important; }
        .playbook-cta-btn:hover { background-color: #2563eb !important; }
        .lesson-card-processing { animation: pulse 1.5s ease-in-out infinite; }
        .lesson-add-split-left:hover { background-color: #eff6ff !important; }
        .lesson-add-split-right:hover { background-color: #dbeafe !important; }
        .lesson-section-dropdown-item:hover { background-color: #f3f4f6; }
        @media (max-width: 900px) {
          .playbook-layout {
            flex-direction: column !important;
            overflow: auto !important;
          }
          .playbook-main {
            overflow: visible !important;
            flex: none !important;
            min-height: 400px;
          }
          .playbook-lesson-sidebar {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--border);
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  )
}

interface LessonSidebarCardProps {
  lesson: Lesson
  sections: PlaybookSection[]
  activeSectionId: string
  isLoading: boolean
  hasError: boolean
  errorMsg: string
  isProcessing: boolean
  isBulkRunning: boolean
  onAdd: (targetSectionId?: string) => void
}

function LessonSidebarCard({ lesson, sections, activeSectionId, isLoading, hasError, errorMsg, isProcessing, isBulkRunning, onAdd }: LessonSidebarCardProps) {
  const added = lesson.addedToPlaybook
  const isDisabled = added || isLoading || isBulkRunning
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeSection = sections.find(s => s.id === activeSectionId)
  const activeSectionName = activeSection?.name ?? 'Playbook'

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropdownOpen])

  return (
    <div
      className={isProcessing ? 'lesson-card-processing' : ''}
      style={{
        marginBottom: '8px',
        padding: '12px',
        borderRadius: '7px',
        border: isProcessing
          ? '2px solid #3b82f6'
          : '1px solid var(--border)',
        backgroundColor: isProcessing ? '#eff6ff' : '#fff',
        opacity: isLoading ? 0.8 : 1,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}>
      <p style={{
        margin: '0 0 4px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        lineHeight: '1.3',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
      }}>
        {lesson.title}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
        {formatDate(lesson.createdAt)}
      </p>

      {hasError && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '5px',
          marginBottom: '8px', padding: '6px 8px',
          backgroundColor: '#fef2f2', borderRadius: '5px',
          fontSize: '11px', color: '#dc2626', lineHeight: '1.4',
        }}>
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Button area */}
      {added ? (
        <button
          disabled
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            padding: '6px 10px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'not-allowed',
          }}
        >
          <CheckCircle size={12} />
          In Playbook
        </button>
      ) : isLoading || isProcessing ? (
        <button
          disabled
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            padding: '6px 10px',
            borderRadius: '5px',
            border: '1px solid var(--border)',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'not-allowed',
          }}
        >
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Adding...
        </button>
      ) : (
        /* Split button */
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            borderRadius: '5px',
            border: '1px solid var(--border)',
            overflow: 'visible',
          }}>
            {/* Left: add to active section */}
            <button
              onClick={() => onAdd(activeSectionId)}
              disabled={isDisabled}
              className="lesson-add-split-left"
              title={`Add to ${activeSectionName}`}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '6px 8px',
                borderRadius: '5px 0 0 5px',
                border: 'none',
                borderRight: '1px solid var(--border)',
                backgroundColor: '#fff',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isBulkRunning ? 0.6 : 1,
                transition: 'background-color 0.12s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              <PlusCircle size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Add to {activeSectionName}
              </span>
            </button>

            {/* Right: dropdown arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled) setDropdownOpen(prev => !prev)
              }}
              disabled={isDisabled}
              className="lesson-add-split-right"
              title="Choose section"
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 7px',
                borderRadius: '0 5px 5px 0',
                border: 'none',
                backgroundColor: '#fff',
                color: 'var(--text-muted)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isBulkRunning ? 0.6 : 1,
                transition: 'background-color 0.12s',
              }}
            >
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              zIndex: 50,
              overflow: 'hidden',
            }}>
              {sections.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No sections yet
                </div>
              ) : (
                sections.map(section => (
                  <button
                    key={section.id}
                    className="lesson-section-dropdown-item"
                    onClick={() => {
                      setDropdownOpen(false)
                      onAdd(section.id)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: section.id === activeSectionId ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {section.name}
                    </span>
                    {section.id === activeSectionId && (
                      <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 500, flexShrink: 0, marginLeft: '6px' }}>
                        active
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
