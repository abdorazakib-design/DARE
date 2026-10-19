import { fetchUsers } from '@/data/api'
import type { AppUser } from '@/lib/types'

/**
 * Session user — the person using this browser session.
 *
 * The app has no authentication yet, so the "session user" is resolved once:
 *   1. the id stored in localStorage (set on first resolution) if that user
 *      still exists and is active,
 *   2. otherwise the first active admin,
 *   3. otherwise the first active user.
 *
 * It is read-only by design: forms displaying "requested by" auto-fill it and
 * users cannot type anything else.
 */

const STORAGE_KEY = 'dare.session-user-id'

export function getStoredSessionUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storeSessionUserId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* storage unavailable (private mode…) — ignore */
  }
}

/** Resolves (and persists) the user attached to this session. */
export async function resolveSessionUser(): Promise<AppUser | null> {
  const users = await fetchUsers()
  if (users.length === 0) return null

  const storedId = getStoredSessionUserId()
  const stored = users.find((u) => u.id === storedId && u.is_active) ?? null
  const chosen =
    stored ??
    users.find((u) => u.is_active && u.role === 'admin') ??
    users.find((u) => u.is_active) ??
    users[0] ??
    null

  if (chosen) storeSessionUserId(chosen.id)
  return chosen
}
