import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CallRecord } from '../../types/scriptTesting'

interface CalendarHeatmapProps {
  calls: CallRecord[]
  selectedDate: string | null
  onDateSelect: (date: string | null) => void
  accentColor?: string
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function MonthGrid({ year, monthIdx, dateMap, today, selectedDate, accentColor, onDayClick, large }: {
  year: number
  monthIdx: number
  dateMap: Record<string, number>
  today: string
  selectedDate: string | null
  accentColor: string
  onDayClick: (key: string) => void
  large: boolean
}) {
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const startOffset = new Date(year, monthIdx, 1).getDay()
  const cellSize = large ? 36 : undefined

  return (
    <div>
      {!large && (
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          marginBottom: '6px', textAlign: 'center',
        }}>
          {MONTH_LABELS[monthIdx]}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: large ? '3px' : '1px', marginBottom: '2px' }}>
        {DOW_LABELS.map((label, i) => (
          <div key={i} style={{
            fontSize: large ? '11px' : '9px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            opacity: 0.6,
            height: large ? '20px' : undefined,
            lineHeight: large ? '20px' : undefined,
          }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: large ? '3px' : '2px' }}>
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`b${i}`} style={cellSize ? { height: cellSize } : undefined} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = dateMap[dateKey] || 0
          const hasData = count > 0
          const isToday = dateKey === today
          const isSelected = dateKey === selectedDate

          return (
            <div
              key={day}
              onClick={() => onDayClick(dateKey)}
              title={hasData ? `${count} call${count !== 1 ? 's' : ''}` : undefined}
              style={{
                height: cellSize,
                aspectRatio: cellSize ? undefined : '1',
                borderRadius: large ? '4px' : '2px',
                backgroundColor: hasData ? accentColor : 'var(--border)',
                opacity: hasData ? 1 : 0.4,
                cursor: hasData ? 'pointer' : 'default',
                boxSizing: 'border-box',
                border: isSelected
                  ? '2px solid white'
                  : isToday
                  ? '1px solid var(--text-muted)'
                  : '1px solid transparent',
                outline: isSelected ? `2px solid ${accentColor}` : undefined,
                outlineOffset: '1px',
                transition: 'transform 0.1s',
                transform: isSelected ? 'scale(1.08)' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: large ? '12px' : '9px',
                fontWeight: large ? 600 : 400,
                color: hasData ? 'white' : 'var(--text-muted)',
                userSelect: 'none',
              }}
            >
              {large ? day : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarHeatmap({
  calls,
  selectedDate,
  onDateSelect,
  accentColor = 'var(--accent)',
}: CalendarHeatmapProps) {
  const now = new Date()
  const [view, setView] = useState<'year' | 'month'>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const dateMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const call of calls) {
      const key = call.timestamp.slice(0, 10)
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [calls])

  const today = todayKey()

  function handleDayClick(dateKey: string) {
    if (!dateMap[dateKey]) return
    onDateSelect(selectedDate === dateKey ? null : dateKey)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function changeYear(delta: number) {
    setYear(y => y + delta)
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    backgroundColor: active ? accentColor : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    transition: 'background-color 0.12s, color 0.12s',
    fontFamily: 'var(--font-body)',
  })

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button className="btn btn-ghost btn-sm" onClick={view === 'month' ? prevMonth : () => changeYear(-1)} style={{ padding: '4px 8px' }}>
          <ChevronLeft size={14} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {view === 'month' ? `${MONTH_FULL[month]} ${year}` : `${year}`}
          </span>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            gap: '2px',
          }}>
            <button style={toggleStyle(view === 'month')} onClick={() => setView('month')}>Month</button>
            <button style={toggleStyle(view === 'year')} onClick={() => setView('year')}>Year</button>
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={view === 'month' ? nextMonth : () => changeYear(1)} style={{ padding: '4px 8px' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      {view === 'month' && (
        <MonthGrid
          year={year}
          monthIdx={month}
          dateMap={dateMap}
          today={today}
          selectedDate={selectedDate}
          accentColor={accentColor}
          onDayClick={handleDayClick}
          large={true}
        />
      )}

      {view === 'year' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }} className="cal-heatmap-grid">
          {Array.from({ length: 12 }, (_, monthIdx) => (
            <MonthGrid
              key={monthIdx}
              year={year}
              monthIdx={monthIdx}
              dateMap={dateMap}
              today={today}
              selectedDate={selectedDate}
              accentColor={accentColor}
              onDayClick={handleDayClick}
              large={false}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .cal-heatmap-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 380px) {
          .cal-heatmap-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
