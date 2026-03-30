// Terminal outcomes for the call funnel
export type FunnelOutcome =
  | 'no_connection'
  | 'gk_opening_fail'
  | 'gk_not_in_office_left_message'
  | 'gk_not_in_office_no_message'
  | 'gk_transferred_not_available_left_voicemail'
  | 'gk_transferred_not_available_no_voicemail'
  | 'owner_opening_fail'
  | 'explainer_fail'
  | 'close_fail'
  | 'appointment_booked'
  // Same owner outcomes but via gatekeeper transfer:
  | 'gk_owner_opening_fail'
  | 'gk_explainer_fail'
  | 'gk_close_fail'
  | 'gk_appointment_booked'

export interface CallRecord {
  id: string
  timestamp: string       // ISO date
  path: string[]          // sequence of stage labels taken
  outcome: FunnelOutcome
  notes?: string          // for fail points
}

export interface CallbackRecord {
  id: string
  timestamp: string
  originalCallId: string  // links to the call where message/voicemail was left
}

export interface TestScript {
  id: string
  name: string            // e.g. "Version A - Shorter opener"
  scriptContent: string   // frozen snapshot of script at time of creation
  createdAt: string
  archived: boolean
  calls: CallRecord[]
  callbacks: CallbackRecord[]
}

// --- Tally flow state machine types ---

export type TallyStage =
  | 'idle'
  | 'pick_up'
  | 'who_answered'
  | 'gk_result'
  | 'gk_pass_result'
  | 'nio_result'
  | 'transferred_result'
  | 'ona_result'
  | 'owner_tree'
  | 'explainer_stage'
  | 'close_stage'
  | 'notes_input'
  | 'done'

export interface TallyOption {
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
}

export interface TallyStateSnapshot {
  stage: TallyStage
  viaGatekeeper: boolean
  path: string[]
  pendingOutcome: FunnelOutcome | null
  notes: string
}

export interface TallyState {
  stage: TallyStage
  viaGatekeeper: boolean
  path: string[]
  pendingOutcome: FunnelOutcome | null
  notes: string
  history: TallyStateSnapshot[]
}

export type TallyAction =
  | { type: 'START' }
  | { type: 'PICK'; action: string }
  | { type: 'BACK' }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SAVE_NOTES' }
  | { type: 'SKIP_NOTES' }
  | { type: 'RESET' }

// Outcome labels for display
export const OUTCOME_LABELS: Record<FunnelOutcome, string> = {
  no_connection: 'No Connection',
  gk_opening_fail: 'GK Opening Fail',
  gk_not_in_office_left_message: 'Left Message (GK)',
  gk_not_in_office_no_message: 'No Message (GK)',
  gk_transferred_not_available_left_voicemail: 'Left Voicemail (GK)',
  gk_transferred_not_available_no_voicemail: 'No Voicemail (GK)',
  owner_opening_fail: 'Owner Opening Fail',
  explainer_fail: 'Explainer Fail',
  close_fail: 'Close Fail',
  appointment_booked: 'Appointment Booked',
  gk_owner_opening_fail: 'Owner Opening Fail (via GK)',
  gk_explainer_fail: 'Explainer Fail (via GK)',
  gk_close_fail: 'Close Fail (via GK)',
  gk_appointment_booked: 'Appointment Booked (via GK)',
}

// Which outcomes count as "message/voicemail left" (eligible for callback)
export const CALLBACK_ELIGIBLE_OUTCOMES: FunnelOutcome[] = [
  'gk_not_in_office_left_message',
  'gk_transferred_not_available_left_voicemail',
]

// Which outcomes count as booked
export const BOOKED_OUTCOMES: FunnelOutcome[] = [
  'appointment_booked',
  'gk_appointment_booked',
]

// Which outcomes count as "reached owner"
export const REACHED_OWNER_OUTCOMES: FunnelOutcome[] = [
  'owner_opening_fail',
  'explainer_fail',
  'close_fail',
  'appointment_booked',
  'gk_owner_opening_fail',
  'gk_explainer_fail',
  'gk_close_fail',
  'gk_appointment_booked',
]
