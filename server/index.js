import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const app = express()
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

const TOKENS_PATH = path.join(__dirname, 'tokens.json')
const REDIRECT_URI = 'http://localhost:3001/auth/callback'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1fYBITP5uMaCvN-3CCwN2K9wGdtWHvjQxWe14tLlFp8k'

const TAB_NAME = 'Call Log'

const SHEET_HEADERS = [
  'Day of Week', 'Date', 'Time Block', 'Script Version', 'Total Calls',
  'Connected', 'No Connection', 'Via Gatekeeper', 'GK Opening Fail',
  'Not in Office', 'Left Message', 'GK Pass', 'Owner Reached',
  'Owner Opening Fail', 'Explainer Fail', 'Close Fail', 'Booked',
]

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Return the US local hour (0-23) for a UTC timestamp in the given IANA timezone
function getUSHour(isoTimestamp, timezone) {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date(isoTimestamp)),
    10,
  ) % 24
}

// Early = 8–10am, Mid = 10am–1pm, Afternoon = 1–5pm, Other = everything else
function getTimeBlock(isoTimestamp, timezone) {
  const h = getUSHour(isoTimestamp, timezone)
  if (h >= 8 && h < 10) return 'Early'
  if (h >= 10 && h < 13) return 'Mid'
  if (h >= 13 && h < 17) return 'Afternoon'
  return 'Other'
}

// Outcome set helpers
const GK_PASS_OUTCOMES = [
  'gk_owner_opening_fail', 'gk_explainer_fail', 'gk_close_fail', 'gk_appointment_booked',
  'gk_transferred_not_available_left_voicemail', 'gk_transferred_not_available_no_voicemail',
]
const OWNER_REACHED_OUTCOMES = [
  'owner_opening_fail', 'explainer_fail', 'close_fail', 'appointment_booked',
  'gk_owner_opening_fail', 'gk_explainer_fail', 'gk_close_fail', 'gk_appointment_booked',
]

function aggregateCalls(calls, date, timeBlock, scriptName) {
  const total = calls.length
  const connected = calls.filter(c => c.outcome !== 'no_connection').length
  const noConnection = calls.filter(c => c.outcome === 'no_connection').length
  const viaGatekeeper = calls.filter(c => Array.isArray(c.path) && c.path.includes('gatekeeper')).length
  const gkOpeningFail = calls.filter(c => c.outcome === 'gk_opening_fail').length
  const notInOffice = calls.filter(c =>
    c.outcome === 'gk_not_in_office_left_message' || c.outcome === 'gk_not_in_office_no_message'
  ).length
  const leftMessage = calls.filter(c =>
    c.outcome === 'gk_not_in_office_left_message' || c.outcome === 'gk_transferred_not_available_left_voicemail'
  ).length
  const gkPass = calls.filter(c => GK_PASS_OUTCOMES.includes(c.outcome)).length
  const ownerReached = calls.filter(c => OWNER_REACHED_OUTCOMES.includes(c.outcome)).length
  const ownerOpeningFail = calls.filter(c =>
    c.outcome === 'gk_owner_opening_fail' || c.outcome === 'owner_opening_fail'
  ).length
  const explainerFail = calls.filter(c =>
    c.outcome === 'gk_explainer_fail' || c.outcome === 'explainer_fail'
  ).length
  const closeFail = calls.filter(c =>
    c.outcome === 'gk_close_fail' || c.outcome === 'close_fail'
  ).length
  const booked = calls.filter(c =>
    c.outcome === 'gk_appointment_booked' || c.outcome === 'appointment_booked'
  ).length

  const dayOfWeek = DOW[new Date(date + 'T12:00:00').getDay()]

  return [
    dayOfWeek, date, timeBlock, scriptName, total,
    connected, noConnection, viaGatekeeper, gkOpeningFail,
    notInOffice, leftMessage, gkPass, ownerReached,
    ownerOpeningFail, explainerFail, closeFail, booked,
  ]
}

// ── Auth helpers ────────────────────────────────────────────────────────────

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  )
}

function loadTokens() {
  if (fs.existsSync(TOKENS_PATH)) {
    try { return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')) } catch { return null }
  }
  return null
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2))
}

async function getAuthClient() {
  const tokens = loadTokens()
  if (!tokens) return null
  const client = createOAuth2Client()
  client.setCredentials(tokens)
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 60_000) {
    try {
      const { credentials } = await client.refreshAccessToken()
      saveTokens(credentials)
      client.setCredentials(credentials)
    } catch {
      return null
    }
  }
  return client
}

// ── Routes ──────────────────────────────────────────────────────────────────

// Auth status
app.get('/api/auth/status', (_req, res) => {
  res.json({ authenticated: !!loadTokens() })
})

// Start OAuth flow
app.get('/api/auth/google', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env')
  }
  const url = createOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
  res.redirect(url)
})

// OAuth callback (Google redirects here directly — not through Vite proxy)
app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query
  if (error) return res.redirect('http://localhost:5173?auth=error')
  try {
    const client = createOAuth2Client()
    const { tokens } = await client.getToken(String(code))
    saveTokens(tokens)
    res.redirect('http://localhost:5173?auth=success')
  } catch (err) {
    console.error('OAuth callback error:', err.message)
    res.redirect('http://localhost:5173?auth=error')
  }
})

// Sync daily summary rows (one per time block) to sheet
app.post('/api/sync', async (req, res) => {
  const { calls, scriptName, date } = req.body

  if (!calls || !Array.isArray(calls)) {
    return res.status(400).json({ error: 'calls array is required' })
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' })
  }

  console.log(`\n[sync] scriptName="${scriptName}" date="${date}" calls=${calls.length}`)

  try {
    const auth = await getAuthClient()
    if (!auth) return res.status(401).json({ error: 'Not authenticated' })

    const sheets = google.sheets({ version: 'v4', auth })

    // Ensure "Call Log" tab exists with headers
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const existingTabs = (meta.data.sheets || []).map(s => s.properties.title)
    console.log(`[sync] existing tabs: ${existingTabs.join(', ')}`)

    if (!existingTabs.includes(TAB_NAME)) {
      console.log(`[sync] creating tab "${TAB_NAME}"`)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
      })
    }

    // Always write headers so column structure stays up to date
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [SHEET_HEADERS] },
    })
    console.log(`[sync] headers written`)

    // Group calls by time block
    const groups = {}
    for (const call of calls) {
      const tz = call.callingTimezone || 'America/New_York'
      const block = getTimeBlock(call.timestamp, tz)
      if (!groups[block]) groups[block] = []
      groups[block].push(call)
    }
    const blocks = Object.keys(groups)
    console.log(`[sync] time blocks found: ${blocks.join(', ')}`)

    // Read all existing rows once
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A:Q`,
    })
    const existingRows = existing.data.values || []

    let added = 0
    let updated = 0

    for (const block of blocks) {
      const blockCalls = groups[block]
      const newRow = aggregateCalls(blockCalls, date, block, scriptName)

      // Match on: col B (date, index 1), col C (timeBlock, index 2), col D (scriptName, index 3)
      let matchIndex = -1
      for (let i = 1; i < existingRows.length; i++) {
        if (existingRows[i][1] === date && existingRows[i][2] === block && existingRows[i][3] === scriptName) {
          matchIndex = i
          break
        }
      }

      if (matchIndex !== -1) {
        const sheetRow = matchIndex + 1
        console.log(`[sync] updating block "${block}" at sheet row ${sheetRow}`)
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${TAB_NAME}'!A${sheetRow}:Q${sheetRow}`,
          valueInputOption: 'RAW',
          requestBody: { values: [newRow] },
        })
        updated++
      } else {
        console.log(`[sync] appending new row for block "${block}"`)
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${TAB_NAME}'!A:Q`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [newRow] },
        })
        added++
      }
    }

    console.log(`[sync] done — added=${added} updated=${updated}`)
    res.json({ added, updated })
  } catch (err) {
    console.error('[sync] ERROR:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = 3001
app.listen(PORT, () => {
  console.log(`Sheets server running on http://localhost:${PORT}`)
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set in .env')
  }
})
