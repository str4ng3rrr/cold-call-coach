import { useReducer, useCallback } from 'react'
import type {
  TallyState,
  TallyAction,
  TallyOption,
  FunnelOutcome,
} from '../types/scriptTesting'

const initialState: TallyState = {
  stage: 'idle',
  viaGatekeeper: false,
  path: [],
  pendingOutcome: null,
  notes: '',
}

function reducer(state: TallyState, action: TallyAction): TallyState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'START':
      return { ...initialState, stage: 'pick_up' }

    case 'SET_NOTES':
      return { ...state, notes: action.notes }

    case 'SAVE_NOTES':
    case 'SKIP_NOTES':
      return { ...state, stage: 'done', notes: action.type === 'SKIP_NOTES' ? '' : state.notes }

    case 'PICK':
      return handlePick(state, action.action)

    default:
      return state
  }
}

function handlePick(state: TallyState, action: string): TallyState {
  const path = [...state.path, action]

  switch (state.stage) {
    case 'pick_up': {
      if (action === 'no_connection') {
        return { ...state, stage: 'done', path, pendingOutcome: 'no_connection', notes: '' }
      }
      if (action === 'connected') {
        return { ...state, stage: 'who_answered', path }
      }
      return state
    }

    case 'who_answered': {
      if (action === 'gatekeeper') {
        return { ...state, stage: 'gk_result', path }
      }
      if (action === 'owner') {
        return { ...state, stage: 'owner_tree', viaGatekeeper: false, path }
      }
      return state
    }

    case 'gk_result': {
      if (action === 'gk_opening_fail') {
        return { ...state, stage: 'done', path, pendingOutcome: 'gk_opening_fail', notes: '' }
      }
      if (action === 'gk_pass') {
        return { ...state, stage: 'gk_pass_result', path }
      }
      return state
    }

    case 'gk_pass_result': {
      if (action === 'not_in_office') {
        return { ...state, stage: 'nio_result', path }
      }
      if (action === 'transferred') {
        return { ...state, stage: 'transferred_result', path }
      }
      return state
    }

    case 'nio_result': {
      if (action === 'left_message') {
        return { ...state, stage: 'done', path, pendingOutcome: 'gk_not_in_office_left_message', notes: '' }
      }
      if (action === 'no_message') {
        return { ...state, stage: 'done', path, pendingOutcome: 'gk_not_in_office_no_message', notes: '' }
      }
      return state
    }

    case 'transferred_result': {
      if (action === 'owner_picked_up') {
        return { ...state, stage: 'owner_tree', viaGatekeeper: true, path }
      }
      if (action === 'owner_not_available') {
        return { ...state, stage: 'ona_result', path }
      }
      return state
    }

    case 'ona_result': {
      if (action === 'left_voicemail') {
        return { ...state, stage: 'done', path, pendingOutcome: 'gk_transferred_not_available_left_voicemail', notes: '' }
      }
      if (action === 'no_voicemail') {
        return { ...state, stage: 'done', path, pendingOutcome: 'gk_transferred_not_available_no_voicemail', notes: '' }
      }
      return state
    }

    case 'owner_tree': {
      const gk = state.viaGatekeeper
      if (action === 'opening_fail') {
        const outcome: FunnelOutcome = gk ? 'gk_owner_opening_fail' : 'owner_opening_fail'
        return { ...state, stage: 'notes_input', path, pendingOutcome: outcome }
      }
      if (action === 'opening_good') {
        return { ...state, stage: 'explainer_stage', path }
      }
      return state
    }

    case 'explainer_stage': {
      const gk = state.viaGatekeeper
      if (action === 'explainer_fail') {
        const outcome: FunnelOutcome = gk ? 'gk_explainer_fail' : 'explainer_fail'
        return { ...state, stage: 'notes_input', path, pendingOutcome: outcome }
      }
      if (action === 'explainer_success') {
        return { ...state, stage: 'close_stage', path }
      }
      return state
    }

    case 'close_stage': {
      const gk = state.viaGatekeeper
      if (action === 'close_fail') {
        const outcome: FunnelOutcome = gk ? 'gk_close_fail' : 'close_fail'
        return { ...state, stage: 'notes_input', path, pendingOutcome: outcome }
      }
      if (action === 'appointment_booked') {
        const outcome: FunnelOutcome = gk ? 'gk_appointment_booked' : 'appointment_booked'
        return { ...state, stage: 'done', path, pendingOutcome: outcome, notes: '' }
      }
      return state
    }

    default:
      return state
  }
}

export interface TallyStageInfo {
  title: string
  options: TallyOption[]
}

function getStageInfo(state: TallyState): TallyStageInfo {
  switch (state.stage) {
    case 'idle':
      return {
        title: 'Ready to log a call',
        options: [{ label: 'New Call', action: 'START', variant: 'primary' }],
      }

    case 'pick_up':
      return {
        title: 'Did they pick up?',
        options: [
          { label: 'No Connection', action: 'no_connection', variant: 'secondary' },
          { label: 'Connected', action: 'connected', variant: 'success' },
        ],
      }

    case 'who_answered':
      return {
        title: 'Who answered?',
        options: [
          { label: 'Gatekeeper', action: 'gatekeeper', variant: 'warning' },
          { label: 'Owner / Decision Maker', action: 'owner', variant: 'success' },
        ],
      }

    case 'gk_result':
      return {
        title: 'Gatekeeper result?',
        options: [
          { label: 'GK Opening Fail', action: 'gk_opening_fail', variant: 'danger' },
          { label: 'GK Pass', action: 'gk_pass', variant: 'success' },
        ],
      }

    case 'gk_pass_result':
      return {
        title: 'Where did GK send you?',
        options: [
          { label: 'Owner Not in Office', action: 'not_in_office', variant: 'secondary' },
          { label: 'Transferred to Owner', action: 'transferred', variant: 'success' },
        ],
      }

    case 'nio_result':
      return {
        title: 'Owner not in office — did you leave a message?',
        options: [
          { label: 'Left a Message', action: 'left_message', variant: 'primary' },
          { label: 'No Message', action: 'no_message', variant: 'secondary' },
        ],
      }

    case 'transferred_result':
      return {
        title: 'Transfer result?',
        options: [
          { label: 'Owner Picked Up', action: 'owner_picked_up', variant: 'success' },
          { label: 'Owner Not Available', action: 'owner_not_available', variant: 'secondary' },
        ],
      }

    case 'ona_result':
      return {
        title: 'Owner not available — did you leave a voicemail?',
        options: [
          { label: 'Left Voicemail', action: 'left_voicemail', variant: 'primary' },
          { label: 'No Voicemail', action: 'no_voicemail', variant: 'secondary' },
        ],
      }

    case 'owner_tree':
      return {
        title: 'Owner opener result?',
        options: [
          { label: 'Opening Fail', action: 'opening_fail', variant: 'danger' },
          { label: 'Opening Good', action: 'opening_good', variant: 'success' },
        ],
      }

    case 'explainer_stage':
      return {
        title: 'Explainer result?',
        options: [
          { label: 'Explainer Fail', action: 'explainer_fail', variant: 'danger' },
          { label: 'Explainer Success', action: 'explainer_success', variant: 'success' },
        ],
      }

    case 'close_stage':
      return {
        title: 'Close result?',
        options: [
          { label: 'Close Fail', action: 'close_fail', variant: 'danger' },
          { label: 'Appointment Booked!', action: 'appointment_booked', variant: 'success' },
        ],
      }

    case 'notes_input':
      return {
        title: 'Add notes (optional)',
        options: [],
      }

    case 'done':
      return {
        title: 'Call logged',
        options: [{ label: 'Log Another Call', action: 'START', variant: 'primary' }],
      }

    default:
      return { title: '', options: [] }
  }
}

export function useTallyFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const pick = useCallback((action: string) => dispatch({ type: 'PICK', action }), [])
  const setNotes = useCallback((notes: string) => dispatch({ type: 'SET_NOTES', notes }), [])
  const saveNotes = useCallback(() => dispatch({ type: 'SAVE_NOTES' }), [])
  const skipNotes = useCallback(() => dispatch({ type: 'SKIP_NOTES' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const stageInfo = getStageInfo(state)

  return {
    state,
    stageInfo,
    start,
    pick,
    setNotes,
    saveNotes,
    skipNotes,
    reset,
    isDone: state.stage === 'done',
    isIdle: state.stage === 'idle',
  }
}
