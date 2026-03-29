import { useState, useEffect, useRef } from 'react'
import { X, FlaskConical } from 'lucide-react'
import { StorageKeys } from '../../lib/storage'

interface CreateVersionModalProps {
  onConfirm: (name: string, scriptContent: string) => void
  onClose: () => void
}

export default function CreateVersionModal({ onConfirm, onClose }: CreateVersionModalProps) {
  const [name, setName] = useState('')
  const [scriptContent, setScriptContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load current script content as snapshot
    const current = localStorage.getItem(StorageKeys.Script) || ''
    setScriptContent(current)
    // Focus name field
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed, scriptContent)
    onClose()
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(45,42,38,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        animation: 'pageIn 0.2s ease both',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FlaskConical size={18} color="var(--accent)" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              New Test Version
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Version name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g. "Version A - Shorter opener"'
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg)',
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              Script snapshot
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              This is a frozen copy of your current script. You can edit it before saving.
            </div>
            <textarea
              value={scriptContent}
              onChange={e => setScriptContent(e.target.value)}
              rows={8}
              placeholder="Paste or edit your script here..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg)',
                resize: 'vertical',
              }}
            />
          </div>

          {scriptContent === '' && (
            <div style={{
              fontSize: '12px',
              color: 'var(--terracotta)',
              padding: '8px 12px',
              backgroundColor: 'var(--terracotta-light)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--terracotta-border)',
            }}>
              No script found. Go to the Script page to write one, or paste your script above.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
            >
              Create Version
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
