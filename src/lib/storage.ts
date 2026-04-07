export const StorageKeys = {
  Lessons: 'ccc_lessons',
  Playbook: 'ccc_playbook',
  PlaybookSections: 'ccc_playbook_sections',
  Script: 'ccc_script',
  ScriptChats: 'ccc_script_chats',
  ScriptVersions: 'ccc_script_versions',
  Chat: 'ccc_chat',
  Onboarded: 'ccc_onboarded',
  Offers: 'ccc_offers',
  TestScripts: 'ccc_test_scripts',
  CALLING_TZ: 'ccc_calling_tz',
  CustomSemanticIds: 'ccc_custom_semantic_ids',
} as const

export function loadJSON<T>(key: string, fallback: T, validator?: (data: unknown) => data is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (validator && !validator(parsed)) {
      console.warn(`[storage] Invalid data for key "${key}", using fallback`)
      return fallback
    }
    return parsed as T
  } catch {
    console.warn(`[storage] Failed to parse key "${key}", using fallback`)
    return fallback
  }
}

export function isValidArray(data: unknown): data is unknown[] {
  return Array.isArray(data)
}

export function isValidObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data)
}

export function saveJSON(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export function loadString(key: string, fallback = ''): string {
  return localStorage.getItem(key) || fallback
}

export function saveString(key: string, value: string): void {
  localStorage.setItem(key, value)
}

export function hasApiKey(): boolean {
  return !!import.meta.env.VITE_ANTHROPIC_API_KEY
}
