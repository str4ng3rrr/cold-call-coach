import { useState } from 'react'
import { Briefcase, Plus, Pencil, Trash2, X, Sparkles } from 'lucide-react'
import { StorageKeys, loadJSON, saveJSON } from '../lib/storage'

interface Offer {
  id: string
  name: string
  description: string
  benefits: string[]
  createdAt: string
}

function buildFormOffer(id: string, name: string, description: string, benefits: string[]): Offer {
  return {
    id,
    name: name.trim(),
    description: description.trim(),
    benefits: benefits.map(b => b.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  }
}

export default function MyOfferPage() {
  const [offers, setOffers] = useState<Offer[]>(() =>
    loadJSON<Offer[]>(StorageKeys.Offers, [])
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBenefits, setFormBenefits] = useState<string[]>([])

  function openNew() {
    setEditingId('new')
    setFormName('')
    setFormDescription('')
    setFormBenefits([])
  }

  function openEdit(offer: Offer) {
    setEditingId(offer.id)
    setFormName(offer.name)
    setFormDescription(offer.description)
    setFormBenefits(offer.benefits.length > 0 ? [...offer.benefits] : [])
  }

  function cancelForm() {
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormBenefits([])
  }

  function saveOffer() {
    if (!formName.trim()) return
    let updated: Offer[]
    if (editingId === 'new') {
      const newOffer = buildFormOffer(crypto.randomUUID(), formName, formDescription, formBenefits)
      updated = [newOffer, ...offers]
    } else {
      updated = offers.map(o =>
        o.id === editingId
          ? { ...buildFormOffer(o.id, formName, formDescription, formBenefits), createdAt: o.createdAt }
          : o
      )
    }
    setOffers(updated)
    saveJSON(StorageKeys.Offers, updated)
    cancelForm()
  }

  function deleteOffer(id: string) {
    const updated = offers.filter(o => o.id !== id)
    setOffers(updated)
    saveJSON(StorageKeys.Offers, updated)
  }

  function addBenefit() {
    setFormBenefits(prev => [...prev, ''])
  }

  function updateBenefit(index: number, value: string) {
    setFormBenefits(prev => prev.map((b, i) => (i === index ? value : b)))
  }

  function removeBenefit(index: number) {
    setFormBenefits(prev => prev.filter((_, i) => i !== index))
  }

  async function generateBenefits() {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey || !formName.trim() || !formDescription.trim()) return

    const targetId = editingId ?? 'new'
    setGeneratingId(targetId)

    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `Given this service offering, suggest 4-6 compelling benefits a business owner would care about. Return ONLY a JSON array of strings, no prose or markdown fences.\n\nService: ${formName}\nDescription: ${formDescription}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.text().catch(() => response.statusText)
        throw new Error(`API error ${response.status}: ${err}`)
      }

      const data = await response.json()
      let raw: string = data.content?.[0]?.text ?? '[]'
      // Strip markdown code fences if present
      raw = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsed = JSON.parse(raw) as string[]
      setFormBenefits(Array.isArray(parsed) ? parsed : [])
    } catch (err) {
      console.error('Failed to generate benefits:', err)
    } finally {
      setGeneratingId(null)
    }
  }

  const isGenerating = generatingId !== null
  const canGenerate = formName.trim().length > 0 && formDescription.trim().length > 0 && !isGenerating

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  function FormCard() {
    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
          {editingId === 'new' ? 'New Offer' : 'Edit Offer'}
        </div>

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            Name
          </label>
          <input
            type="text"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. Monthly SEO Retainer"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            Description
          </label>
          <textarea
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            placeholder="Describe the service, what's included, and who it's for..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
              Benefits
            </label>
            <button
              onClick={generateBenefits}
              disabled={!canGenerate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: canGenerate ? '#7c3aed' : 'var(--border)',
                backgroundColor: canGenerate ? '#f5f3ff' : '#f9fafb',
                color: canGenerate ? '#7c3aed' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.12s, border-color 0.12s, color 0.12s',
              }}
            >
              <Sparkles size={12} />
              {isGenerating ? 'Generating...' : 'Generate Benefits'}
            </button>
          </div>

          {formBenefits.map((benefit, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={benefit}
                onChange={e => updateBenefit(i, e.target.value)}
                placeholder={`Benefit ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <button
                onClick={() => removeBenefit(i)}
                title="Remove benefit"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#fff',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <button
            onClick={addBenefit}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              padding: '0',
              fontSize: '12px',
              fontWeight: 500,
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={12} />
            Add Benefit
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          <button
            onClick={saveOffer}
            disabled={!formName.trim()}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: formName.trim() ? '#3b82f6' : '#d1d5db',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: formName.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.12s',
            }}
          >
            Save
          </button>
          <button
            onClick={cancelForm}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            My Offers
          </h1>
        {editingId === null && (
          <button
            onClick={openNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
            className="offer-add-btn"
          >
            <Plus size={14} />
            Add Offer
          </button>
        )}
      </div>

      {/* Empty state */}
      {offers.length === 0 && editingId === null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            textAlign: 'center',
          }}
        >
          <Briefcase
            size={40}
            style={{ marginBottom: '14px', opacity: 0.25, color: 'var(--text-muted)' }}
          />
          <p
            style={{
              fontSize: '16px',
              fontWeight: 500,
              margin: '0 0 6px',
              color: 'var(--text-primary)',
            }}
          >
            No offers yet
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              margin: '0 0 20px',
            }}
          >
            Define your service offerings to reference during calls.
          </p>
          <button
            onClick={openNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Add your first service offering
          </button>
        </div>
      )}

      {/* Card grid */}
      {(offers.length > 0 || editingId !== null) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Form card shown first in the grid */}
          {editingId !== null && <FormCard />}

          {/* Offer cards */}
          {offers
            .filter(o => o.id !== editingId)
            .map(offer => (
              <div
                key={offer.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {offer.name}
                </div>

                {offer.description && (
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      marginTop: '8px',
                      lineHeight: '1.5',
                    }}
                  >
                    {offer.description}
                  </div>
                )}

                {offer.benefits.length > 0 && (
                  <ul
                    style={{
                      marginTop: '12px',
                      marginBottom: 0,
                      padding: 0,
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {offer.benefits.map((benefit, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Card footer */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: 'auto',
                    paddingTop: '16px',
                  }}
                >
                  <button
                    onClick={() => openEdit(offer)}
                    className="offer-edit-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
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
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteOffer(offer.id)}
                    className="offer-delete-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fff',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.12s',
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <style>{`
        .offer-add-btn:hover { background-color: #2563eb !important; }
        .offer-edit-btn:hover { background-color: #f9fafb !important; }
        .offer-delete-btn:hover { background-color: #fef2f2 !important; }
      `}</style>
    </div>
    </div>
  )
}
