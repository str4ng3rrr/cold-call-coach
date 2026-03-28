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
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
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
