import { useState } from 'react'
import { BookOpen, BookMarked, FileText } from 'lucide-react'

const ONBOARDED_KEY = 'ccc_onboarded'
const LESSONS_KEY = 'ccc_lessons'

const SAMPLE_LESSONS = (() => {
  function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  return [
    {
      id: generateId(),
      title: 'Strong Opening Example',
      transcript: `Rep: Hi, is this Sarah? This is Marcus calling from SalesFlow.
Sarah: Yes, who's this?
Rep: Hi Sarah, I know I'm calling out of the blue — I'll be quick. I'm Marcus from SalesFlow. We help revenue ops teams at mid-market SaaS companies cut their lead response time in half using automated routing. I noticed Brightpath just closed a Series B and is likely scaling your sales team. I had two minutes — did I catch you at a bad time?
Sarah: No, go ahead.
Rep: Great. Most of our customers used to have leads sitting unassigned for four to six hours. After SalesFlow, that drops to under two minutes. We've seen a 30% lift in connect rates as a result. Is that kind of lag something you're running into at Brightpath?
Sarah: Honestly, yeah. We've been talking about that internally.
Rep: That's exactly why I called. Would it make sense to grab 20 minutes this week to walk through how we solved it for a company your size?`,
      feedback: `Strong opening. Key strengths observed:

**Hook and Permission**: The rep immediately acknowledged the cold call nature and asked for permission to continue — this disarms the prospect and shows respect for their time.

**Relevance Signal**: Referencing the Series B raise demonstrates research and makes the outreach feel timely rather than random. Prospects respond better when they believe the timing is intentional.

**Concrete Value Claim**: Stating "cut lead response time in half" with a specific "30% lift in connect rates" gives the prospect something tangible to evaluate. Vague claims like "improve efficiency" rarely create curiosity.

**Problem Discovery**: Rather than pitching further, the rep pivoted to a question tied directly to the value claim. This confirms pain before asking for a meeting.

**Clean Ask**: The 20-minute meeting request is specific and low-commitment. Avoid asking for "a quick call" without specifying duration.

Coaching tip: Consider adding one reference customer by name or industry for additional credibility before the close.`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      addedToPlaybook: false,
      tags: ['opening', 'permission-based'],
    },
    {
      id: generateId(),
      title: 'Objection Handling Practice',
      transcript: `Rep: Hi Daniel, this is Priya from CloudMetrics. We help engineering leaders at growth-stage companies get real-time visibility into cloud spend. Do you have 90 seconds?
Daniel: We're actually pretty happy with what we have right now.
Rep: Totally fair — most engineering leaders I talk to say the same thing before they see what they're missing. Can I ask — when your team gets a surprise bill from AWS at the end of the month, how long does it typically take to track down what caused it?
Daniel: Sometimes a few hours, sometimes longer.
Rep: Right, that's the gap we close. CloudMetrics surfaces anomalies in real time so your team knows within minutes, not after the fact. It doesn't replace your current setup — it sits on top of it. The question is whether that kind of visibility would save your team time. Would that be worth 20 minutes to explore?
Daniel: Maybe. Send me something first.
Rep: Happy to. I'll send a one-pager. And just so I can make it relevant — is the main pain the billing surprises, or is it more about forecasting next quarter's spend?
Daniel: Mostly the surprises.
Rep: Perfect, I'll tailor it to that. I'll follow up Thursday — does morning or afternoon work better for a call?`,
      feedback: `Solid objection handling throughout. Analysis:

**"We're happy with what we have"**: The rep correctly avoided arguing or immediately pitching harder. Instead, she pivoted to a diagnostic question that creates contrast without being combative. This is the right move — never fight the "happy" objection directly.

**Isolating the Pain**: "How long does it take to track down what caused it?" is a precision question. It bypasses the stated satisfaction and probes for a hidden friction point. The prospect revealed a real pain (hours to investigate) that contradicts being fully happy.

**Handling "Send me something"**: The rep agreed without losing momentum. She immediately asked a qualifying question while promising the follow-up, which keeps her in control of the next step and makes the send relevant.

**Locking the Next Step**: Rather than leaving follow-up open-ended, she proposed Thursday and offered a binary choice (morning or afternoon). This increases the chance the meeting actually happens.

Coaching tip: Acknowledge the objection more explicitly before redirecting — a brief "I hear you" before the pivot would make the response feel less scripted.`,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      addedToPlaybook: false,
      tags: ['objection-handling', 'follow-up'],
    },
  ]
})()

interface Props {
  onClose: () => void
}

export default function Onboarding({ onClose }: Props) {
  const [visible] = useState(() => !localStorage.getItem(ONBOARDED_KEY))

  if (!visible) return null

  function handleGetStarted() {
    localStorage.setItem(ONBOARDED_KEY, 'true')
    onClose()
  }

  function handleLoadSampleData() {
    try {
      const existing = JSON.parse(localStorage.getItem(LESSONS_KEY) || '[]')
      const merged = [...existing, ...SAMPLE_LESSONS]
      localStorage.setItem(LESSONS_KEY, JSON.stringify(merged))
    } catch {
      localStorage.setItem(LESSONS_KEY, JSON.stringify(SAMPLE_LESSONS))
    }
    localStorage.setItem(ONBOARDED_KEY, 'true')
    onClose()
  }

  const steps = [
    {
      Icon: BookOpen,
      title: 'Paste Transcripts',
      description: 'Upload your cold call recordings to get AI analysis and feedback',
    },
    {
      Icon: BookMarked,
      title: 'Build Your Playbook',
      description: 'Turn lessons into a best-practices document organized by topic',
    },
    {
      Icon: FileText,
      title: 'Refine Your Script',
      description: 'Use AI to improve your cold call script based on your playbook',
    },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          animation: 'cardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-light)',
              marginBottom: '16px',
            }}
          >
            <BookOpen size={24} color="var(--accent)" />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: '8px',
            }}
          >
            Welcome to Cold Call Coach
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            Improve your cold calls with AI-powered coaching. Here's how it works:
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          {steps.map(({ Icon, title, description }, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px',
                backgroundColor: 'var(--sidebar-bg)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-light)',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color="var(--accent)" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '3px',
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleGetStarted}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            Get Started
          </button>
          <button
            onClick={handleLoadSampleData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--sidebar-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
          >
            Load Sample Data
          </button>
        </div>
      </div>
    </div>
  )
}
