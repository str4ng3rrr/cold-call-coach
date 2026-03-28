import { useState, useEffect, useRef } from 'react'
import { PlusCircle, Pencil, Check, X, Calendar, BookMarked } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  transcript: string
  feedback: string
  createdAt: string
  addedToPlaybook: boolean
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadLessons(): Lesson[] {
  try {
    return JSON.parse(localStorage.getItem('ccc_lessons') || '[]')
  } catch {
    return []
  }
}

function saveLessons(lessons: Lesson[]) {
  localStorage.setItem('ccc_lessons', JSON.stringify(lessons))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>(() => loadLessons())
  const [showInput, setShowInput] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveLessons(lessons)
  }, [lessons])

  useEffect(() => {
    if (editingId && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingId])

  function handleSubmit() {
    if (!transcript.trim()) return
    const now = new Date().toISOString()
    const preview = transcript.trim().slice(0, 40).replace(/\n/g, ' ')
    const defaultTitle = `Call — ${preview}${transcript.length > 40 ? '…' : ''}`

    const newLesson: Lesson = {
      id: generateId(),
      title: defaultTitle,
      transcript: transcript.trim(),
      feedback: '',
      createdAt: now,
      addedToPlaybook: false,
    }
    setLessons(prev => [newLesson, ...prev])
    setTranscript('')
    setShowInput(false)
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

  function deleteLesson(id: string) {
    setLessons(prev => prev.filter(l => l.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Lessons</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            {lessons.length} {lessons.length === 1 ? 'call' : 'calls'} uploaded
          </p>
        </div>
        <button
          onClick={() => setShowInput(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '6px', border: 'none',
            backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <PlusCircle size={15} />
          New Lesson
        </button>
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
              disabled={!transcript.trim()}
              style={{
                padding: '7px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: transcript.trim() ? '#3b82f6' : '#d1d5db',
                color: '#fff', fontSize: '14px', fontWeight: 500,
                cursor: transcript.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Save Lesson
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
          <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No lessons yet</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Click "New Lesson" to paste your first call transcript</p>
        </div>
      )}

      {/* Lesson Grid */}
      {lessons.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {lessons.map(lesson => (
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
                {/* Title row */}
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
                      {lesson.title}
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

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Calendar size={11} />
                    {formatDate(lesson.createdAt)}
                  </span>
                  {lesson.addedToPlaybook && (
                    <span style={{
                      fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                      backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 500,
                    }}>
                      In Playbook
                    </span>
                  )}
                  {!lesson.addedToPlaybook && (
                    <span style={{
                      fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
                      backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 500,
                    }}>
                      Not in Playbook
                    </span>
                  )}
                </div>
              </div>

              {/* Transcript preview */}
              <div
                style={{
                  padding: '0 16px 12px',
                  fontSize: '13px', color: 'var(--text-muted)',
                  lineHeight: '1.5',
                }}
              >
                <p style={{ margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expandedId === lesson.id ? undefined : 3, WebkitBoxOrient: 'vertical' as const }}>
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

              {/* Card Footer */}
              <div style={{
                borderTop: '1px solid var(--border)', padding: '10px 16px',
                display: 'flex', justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => deleteLesson(lesson.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: '#ef4444', fontWeight: 500, padding: '2px 0',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
