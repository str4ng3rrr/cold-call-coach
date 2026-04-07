import { useState, useEffect, useRef, useMemo } from 'react'
import { PlusCircle, Pencil, Check, X, Calendar, BookMarked, ChevronDown, ChevronUp, Download, Search, Tag, SortAsc, SortDesc } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { analyzeTranscript } from '../lib/aiService'
import { StorageKeys } from '../lib/storage'
import { generateId } from '../lib/utils'

interface Lesson {
  id: string
  title: string
  transcript: string
  feedback: string
  createdAt: string
  addedToPlaybook: boolean
  tags?: string[]
}

function loadLessons(): Lesson[] {
  try {
    return JSON.parse(localStorage.getItem(StorageKeys.Lessons) || '[]')
  } catch {
    return []
  }
}

function saveLessons(lessons: Lesson[]) {
  localStorage.setItem(StorageKeys.Lessons, JSON.stringify(lessons))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Stable tag colors derived from tag string so each tag always gets the same color
const TAG_PALETTE = [
  { bg: '#e8f0ed', color: '#1a4d3e', border: '#a3c4b8' },      // Emerald
  { bg: '#f5ebe2', color: '#8b5e3c', border: '#dfc0a3' },      // Terracotta
  { bg: '#f0eafc', color: '#5b3d8f', border: '#c9b8e8' },      // Muted purple
  { bg: '#fef3e2', color: '#92600a', border: '#e8c97a' },      // Warm amber
  { bg: '#e8f4f0', color: '#1a6b5a', border: '#96cebf' },      // Teal
  { bg: '#fce8ec', color: '#943242', border: '#e8a0ad' },      // Dusty rose
  { bg: '#eaf0f5', color: '#3d5a80', border: '#a1b8d0' },      // Slate blue
]

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_PALETTE[hash % TAG_PALETTE.length]
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>(() => loadLessons())
  const [showInput, setShowInput] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedbackExpandedId, setFeedbackExpandedId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, string>>({})
  const [showUnadded, setShowUnadded] = useState(false)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [sortNewest, setSortNewest] = useState(true)
  const [visibleCount, setVisibleCount] = useState(20)

  // Per-card tag input state
  const [addingTagForId, setAddingTagForId] = useState<string | null>(null)
  const [tagInputValue, setTagInputValue] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveLessons(lessons)
  }, [lessons])

  useEffect(() => {
    if (editingId && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    if (addingTagForId && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [addingTagForId])

  async function handleSubmit() {
    if (!transcript.trim()) return
    setSubmitting(true)

    const now = new Date().toISOString()
    const preview = transcript.trim().slice(0, 40).replace(/\n/g, ' ')
    const defaultTitle = `Call — ${preview}${transcript.length > 40 ? '…' : ''}`
    const id = generateId()

    const newLesson: Lesson = {
      id,
      title: defaultTitle,
      transcript: transcript.trim(),
      feedback: '',
      createdAt: now,
      addedToPlaybook: false,
      tags: [],
    }

    setLessons(prev => [newLesson, ...prev])
    setTranscript('')
    setShowInput(false)
    setAnalyzingId(id)

    try {
      const result = await analyzeTranscript(newLesson.transcript)
      setLessons(prev => prev.map(l =>
        l.id === id ? { ...l, title: result.title, feedback: result.feedback } : l
      ))
      setFeedbackExpandedId(id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setAnalyzeErrors(prev => ({ ...prev, [id]: msg }))
    } finally {
      setAnalyzingId(null)
      setSubmitting(false)
    }
  }

  async function handleAnalyze(lesson: Lesson) {
    setAnalyzingId(lesson.id)
    setAnalyzeErrors(prev => { const next = { ...prev }; delete next[lesson.id]; return next })
    try {
      const result = await analyzeTranscript(lesson.transcript)
      setLessons(prev => prev.map(l =>
        l.id === lesson.id ? { ...l, title: result.title, feedback: result.feedback } : l
      ))
      setFeedbackExpandedId(lesson.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setAnalyzeErrors(prev => ({ ...prev, [lesson.id]: msg }))
    } finally {
      setAnalyzingId(null)
    }
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id)
    setEditingTitle(lesson.title)
  }

  function confirmEdit(id: string) {
    if (!editingTitle.trim()) return
    setLessons(prev => prev.map(l => l.id === id ? { ...l, title: editingTitle.trim() } : l))
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function deleteLesson(id: string) {
    setLessons(prev => prev.filter(l => l.id !== id))
    if (expandedId === id) setExpandedId(null)
    if (feedbackExpandedId === id) setFeedbackExpandedId(null)
    setDeletingId(null)
  }

  function addTag(lessonId: string, tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setLessons(prev => prev.map(l => {
      if (l.id !== lessonId) return l
      const existing = l.tags ?? []
      if (existing.includes(trimmed)) return l
      return { ...l, tags: [...existing, trimmed] }
    }))
  }

  function removeTag(lessonId: string, tag: string) {
    setLessons(prev => {
      const next = prev.map(l =>
        l.id === lessonId ? { ...l, tags: (l.tags ?? []).filter(t => t !== tag) } : l
      )
      setActiveTagFilters(prevFilters =>
        prevFilters.filter(t => t !== tag || next.some(l => l.id !== lessonId && (l.tags ?? []).includes(tag)))
      )
      return next
    })
  }

  function commitTagInput(lessonId: string) {
    if (tagInputValue.trim()) {
      addTag(lessonId, tagInputValue)
    }
    setAddingTagForId(null)
    setTagInputValue('')
  }

  function toggleTagFilter(tag: string) {
    setActiveTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // All unique tags across all lessons
  const allTags = useMemo(() => {
    const set = new Set<string>()
    lessons.forEach(l => (l.tags ?? []).forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [lessons])

  // Filtering chain: lessons → search → tag filter → unadded filter → sort → displayedLessons
  const displayedLessons = useMemo(() => {
    let result = [...lessons]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) || l.transcript.toLowerCase().includes(q)
      )
    }

    if (activeTagFilters.length > 0) {
      result = result.filter(l =>
        activeTagFilters.every(tag => (l.tags ?? []).includes(tag))
      )
    }

    if (showUnadded) {
      result = result.filter(l => !l.addedToPlaybook)
    }

    result.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return sortNewest ? diff : -diff
    })

    return result
  }, [lessons, searchQuery, activeTagFilters, showUnadded, sortNewest])

  const isFiltering = searchQuery.trim() !== '' || activeTagFilters.length > 0 || showUnadded

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, activeTagFilters, showUnadded, sortNewest])

  const paginatedLessons = displayedLessons.slice(0, visibleCount)
  const hasMore = visibleCount < displayedLessons.length

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
    <div style={{ padding: '32px', maxWidth: '1100px' }} className="lessons-container">
      {/* Header */}
      <div className="lessons-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>Lessons</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            {lessons.length} {lessons.length === 1 ? 'call' : 'calls'} uploaded
          </p>
        </div>
        <div className="lessons-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Show unadded toggle */}
          <button
            onClick={() => setShowUnadded(v => !v)}
            style={{
              padding: '7px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', border: '1px solid var(--border)',
              backgroundColor: showUnadded ? 'var(--accent-light)' : 'var(--bg-card)',
              color: showUnadded ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: showUnadded ? 'var(--accent-border)' : 'var(--border)',
            }}
          >
            Show unadded only
          </button>

          {/* Export All button */}
          {lessons.length > 0 && (
            <button
              onClick={() => downloadJson(lessons, 'lessons-export.json')}
              className="lessons-export-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '6px',
                border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                transition: 'background-color 0.12s',
              }}
            >
              <Download size={13} />
              Export All
            </button>
          )}

          {/* New Lesson button */}
          <button
            onClick={() => setShowInput(v => !v)}
            className="lessons-new-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '6px', border: 'none',
              backgroundColor: 'var(--accent)', color: 'var(--text-inverse)', fontSize: '14px',
              fontWeight: 500, cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
          >
            <PlusCircle size={15} />
            New Lesson
          </button>
        </div>
      </div>

      {/* Transcript Input */}
      {showInput && (
        <div style={{
          marginBottom: '24px', padding: '20px', borderRadius: '8px',
          border: '1px solid var(--border)', backgroundColor: '#fafafa',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
            PASTE CALL TRANSCRIPT
          </p>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Paste your cold call transcript here..."
            autoFocus
            style={{
              width: '100%', minHeight: '160px', padding: '12px', fontSize: '14px',
              border: '1px solid var(--border)', borderRadius: '6px', resize: 'vertical',
              fontFamily: 'inherit', color: 'var(--text-primary)', backgroundColor: '#fff',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={handleSubmit}
                disabled={!transcript.trim() || submitting}
                className="lessons-save-btn"
                style={{
                  padding: '7px 16px', borderRadius: '6px', border: 'none',
                  backgroundColor: transcript.trim() && !submitting ? 'var(--info)' : '#d1d5db',
                  color: '#fff', fontSize: '14px', fontWeight: 500,
                  cursor: transcript.trim() && !submitting ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.12s',
                }}
              >
              {submitting ? 'Saving...' : 'Save Lesson'}
            </button>
            <button
              onClick={() => { setShowInput(false); setTranscript('') }}
              style={{
                padding: '7px 16px', borderRadius: '6px',
                border: '1px solid var(--border)', backgroundColor: '#fff',
                color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {lessons.length === 0 && !showInput && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <BookMarked size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px', color: 'var(--text-primary)' }}>No lessons yet</p>
          <p style={{ fontSize: '13px', margin: '0 0 20px' }}>Paste a call transcript to get AI-powered feedback</p>
          <button
            onClick={() => setShowInput(true)}
            className="lessons-new-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '10px 20px', borderRadius: '7px', border: 'none',
              backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px',
              fontWeight: 500, cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
          >
            <PlusCircle size={16} />
            Paste your first transcript
          </button>
        </div>
      )}

      {/* Search & Filter Bar — only shown when there are lessons */}
      {lessons.length > 0 && (
        <div className="lessons-filter-bar" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: search + sort */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title or transcript..."
                style={{
                  width: '100%', paddingLeft: '32px', paddingRight: searchQuery ? '30px' : '10px',
                  paddingTop: '7px', paddingBottom: '7px',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  fontSize: '13px', color: 'var(--text-primary)', backgroundColor: '#fff',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
                className="lessons-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <button
              onClick={() => setSortNewest(v => !v)}
              className="lessons-sort-btn"
              title={sortNewest ? 'Showing newest first — click for oldest first' : 'Showing oldest first — click for newest first'}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                border: '1px solid var(--border)', backgroundColor: '#fff',
                color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'background-color 0.12s',
                whiteSpace: 'nowrap',
              }}
            >
              {sortNewest ? <SortDesc size={13} /> : <SortAsc size={13} />}
              {sortNewest ? 'Newest first' : 'Oldest first'}
            </button>
          </div>

          {/* Row 2: tag filter chips */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                <Tag size={11} />
                Filter:
              </span>
              {allTags.map(tag => {
                const active = activeTagFilters.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className="lessons-tag-filter-chip"
                    style={{
                      padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                      cursor: 'pointer', border: active ? '1px solid #3b82f6' : '1px solid var(--border)',
                      backgroundColor: active ? '#eff6ff' : '#fff',
                      color: active ? '#3b82f6' : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
              {activeTagFilters.length > 0 && (
                <button
                  onClick={() => setActiveTagFilters([])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: '#3b82f6', fontWeight: 500, padding: '2px 4px',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtered empty state */}
      {lessons.length > 0 && displayedLessons.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          {isFiltering && searchQuery ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No lessons match your search</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Try a different search term or clear the filters</p>
            </>
          ) : showUnadded ? (
            <>
              <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>All lessons added to playbook</p>
              <p style={{ fontSize: '13px', margin: 0 }}>No unadded lessons to show</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No lessons match your filters</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Try clearing the active tag filters</p>
            </>
          )}
        </div>
      )}

      {/* Lesson Grid */}
      {paginatedLessons.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {paginatedLessons.map(lesson => {
            const isAnalyzing = analyzingId === lesson.id
            const analyzeError = analyzeErrors[lesson.id]
            const feedbackOpen = feedbackExpandedId === lesson.id
            const hasAiFeedback = !!lesson.feedback
            const lessonTags = lesson.tags ?? []

            return (
              <div
                key={lesson.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Card Header */}
                <div style={{ padding: '16px 16px 12px' }}>
                  {editingId === lesson.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <input
                        ref={titleInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit(lesson.id)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        style={{
                          flex: 1, fontSize: '14px', fontWeight: 600, padding: '4px 8px',
                          border: '1px solid #3b82f6', borderRadius: '4px', outline: 'none',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button onClick={() => confirmEdit(lesson.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#22c55e' }}>
                        <Check size={15} />
                      </button>
                      <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#ef4444' }}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4', flex: 1 }}>
                        {hasAiFeedback ? '✨ ' : ''}{lesson.title}
                      </span>
                      <button
                        onClick={() => startEdit(lesson)}
                        title="Edit title"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)', flexShrink: 0 }}
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Calendar size={11} />
                      {formatDate(lesson.createdAt)}
                    </span>
                    {lesson.addedToPlaybook ? (
                      <span style={{
                        fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                        backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 500,
                      }}>
                        In Playbook
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                        backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 500,
                      }}>
                        Not in Playbook
                      </span>
                    )}
                  </div>

                  {/* Tags row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: lessonTags.length > 0 || addingTagForId === lesson.id ? '8px' : '0' }}>
                    {lessonTags.map(tag => {
                      const c = tagColor(tag)
                      return (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            padding: '2px 7px', borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                            backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}`,
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(lesson.id, tag)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                              color: c.color, opacity: 0.6, display: 'flex', alignItems: 'center',
                              marginLeft: '1px',
                            }}
                            title={`Remove tag "${tag}"`}
                          >
                            <X size={9} />
                          </button>
                        </span>
                      )
                    })}

                    {/* Add tag button / inline input */}
                    {addingTagForId === lesson.id ? (
                      <input
                        ref={tagInputRef}
                        value={tagInputValue}
                        onChange={e => setTagInputValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitTagInput(lesson.id)
                          if (e.key === 'Escape') { setAddingTagForId(null); setTagInputValue('') }
                        }}
                        onBlur={() => commitTagInput(lesson.id)}
                        placeholder="tag name"
                        style={{
                          fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                          border: '1px solid #3b82f6', outline: 'none', width: '80px',
                          color: 'var(--text-primary)', backgroundColor: '#fff',
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => { setAddingTagForId(lesson.id); setTagInputValue('') }}
                        title="Add tag"
                        style={{
                          background: 'none', border: '1px dashed var(--border)', borderRadius: '99px',
                          cursor: 'pointer', padding: '2px 7px', fontSize: '11px',
                          color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px',
                          transition: 'border-color 0.12s, color 0.12s',
                        }}
                        className="lessons-add-tag-btn"
                      >
                        <Tag size={9} />
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* Transcript preview — skeleton when analyzing, real content otherwise */}
                {isAnalyzing ? (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div className="skeleton-block" style={{ height: '13px', borderRadius: '4px', marginBottom: '6px', width: '100%' }} />
                    <div className="skeleton-block" style={{ height: '13px', borderRadius: '4px', marginBottom: '6px', width: '85%' }} />
                    <div className="skeleton-block" style={{ height: '13px', borderRadius: '4px', width: '60%' }} />
                  </div>
                ) : (
                  <div style={{ padding: '0 16px 12px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <p style={{
                      margin: 0,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: expandedId === lesson.id ? undefined : 3,
                      WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {lesson.transcript}
                    </p>
                    {lesson.transcript.length > 150 && (
                      <button
                        onClick={() => setExpandedId(v => v === lesson.id ? null : lesson.id)}
                        style={{ background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer', fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}
                      >
                        {expandedId === lesson.id ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                {/* AI Feedback Section */}
                {isAnalyzing && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                    {/* Skeleton for title */}
                    <div className="skeleton-block" style={{ height: '14px', borderRadius: '4px', marginBottom: '8px', width: '55%' }} />
                    {/* Skeleton for metadata row */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div className="skeleton-block" style={{ height: '20px', borderRadius: '99px', width: '70px' }} />
                      <div className="skeleton-block" style={{ height: '20px', borderRadius: '99px', width: '90px' }} />
                    </div>
                    {/* Skeleton analyzing label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{
                        display: 'inline-block', width: '14px', height: '14px',
                        border: '2px solid #d1d5db', borderTopColor: '#3b82f6',
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Analyzing…</span>
                    </div>
                  </div>
                )}

                {!isAnalyzing && analyzeError && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#ef4444' }}>{analyzeError}</p>
                    <button
                      onClick={() => handleAnalyze(lesson)}
                      className="lessons-analyze-btn"
                      style={{
                        background: 'none', border: '1px solid #d1d5db', borderRadius: '5px',
                        padding: '5px 12px', fontSize: '12px', color: 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 500,
                        transition: 'background-color 0.12s, border-color 0.12s',
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isAnalyzing && hasAiFeedback && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setFeedbackExpandedId(v => v === lesson.id ? null : lesson.id)}
                      style={{
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}
                    >
                      <span>AI Feedback</span>
                      {feedbackOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {feedbackOpen && (
                      <div style={{
                        padding: '4px 16px 16px',
                        fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)',
                        borderTop: '1px solid var(--border)',
                      }}>
                        <ReactMarkdown>{lesson.feedback}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {!isAnalyzing && !hasAiFeedback && !analyzeError && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
                    <button
                      onClick={() => handleAnalyze(lesson)}
                      className="lessons-analyze-btn"
                      style={{
                        background: 'none', border: '1px solid #d1d5db', borderRadius: '5px',
                        padding: '5px 12px', fontSize: '12px', color: 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 500,
                        transition: 'background-color 0.12s, border-color 0.12s',
                      }}
                    >
                      Analyze
                    </button>
                  </div>
                )}

                {/* Card Footer */}
                <div style={{
                  borderTop: '1px solid var(--border)', padding: '10px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <button
                    onClick={() => downloadJson(lesson, `lesson-${lesson.id}.json`)}
                    className="lessons-export-single-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, padding: '2px 0',
                      transition: 'color 0.12s',
                    }}
                  >
                    <Download size={12} />
                    Export
                  </button>
                  {deletingId === lesson.id ? (
                    <button
                      onClick={() => deleteLesson(lesson.id)}
                      className="lessons-delete-btn"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '12px', color: '#ef4444', fontWeight: 600, padding: '2px 0',
                      }}
                    >
                      Are you sure?
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeletingId(lesson.id)}
                      className="lessons-delete-btn"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '12px', color: '#ef4444', fontWeight: 500, padding: '2px 0',
                        transition: 'color 0.12s',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => setVisibleCount(c => c + 20)}
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
          >
            Load More ({displayedLessons.length - visibleCount} remaining)
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes skeletonPulse {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .skeleton-block {
          background-color: #e5e7eb;
          animation: skeletonPulse 1.4s ease-in-out infinite;
        }
        .lessons-new-btn:hover { background-color: #2563eb !important; }
        .lessons-export-btn:hover { background-color: #f3f4f6 !important; }
        .lessons-save-btn:hover:not(:disabled) { background-color: #2563eb !important; }
        .lessons-analyze-btn:hover { background-color: #f3f4f6 !important; border-color: #9ca3af !important; }
        .lessons-delete-btn:hover { color: #b91c1c !important; }
        .lessons-export-single-btn:hover { color: #374151 !important; }
        .lessons-sort-btn:hover { background-color: #f3f4f6 !important; }
        .lessons-tag-filter-chip:hover { background-color: #eff6ff !important; border-color: #93c5fd !important; color: #3b82f6 !important; }
        .lessons-add-tag-btn:hover { border-color: #3b82f6 !important; color: #3b82f6 !important; }
        .lessons-search-input:focus { border-color: #3b82f6 !important; }
        @media (max-width: 640px) {
          .lessons-container { padding: 20px 16px !important; }
          .lessons-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .lessons-header-actions { flex-wrap: wrap !important; }
          .lessons-filter-bar > div:first-child { flex-direction: column !important; align-items: stretch !important; }
          .lessons-filter-bar > div:first-child > div { max-width: 100% !important; }
        }
      `}</style>
    </div>
    </div>
  )
}
