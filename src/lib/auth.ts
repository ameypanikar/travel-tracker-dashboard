export const USERS_URL =
  "https://script.google.com/macros/s/AKfycbxK75KALaxQNwDoxm0NB0mnHARmQtENse7dqyQhpZ1Y2KR31H_wOyWKuG1DjAPPO2VPXQ/exec?action=getUsers";

export const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxK75KALaxQNwDoxm0NB0mnHARmQtENse7dqyQhpZ1Y2KR31H_wOyWKuG1DjAPPO2VPXQ/exec";

export type SessionUser = { name: string; username: string; role: string };
type StoredUser = SessionUser & { password: string };

// Use localStorage so login persists across browser sessions / device restarts
const STORAGE_KEY = "travel_dashboard_user";

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  // Also keep sessionStorage in sync for any legacy references
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function login(
  username: string,
  password: string,
): Promise<SessionUser> {
  const res = await fetch(USERS_URL, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not reach login service");
  const json = (await res.json()) as { ok?: boolean; users?: StoredUser[] } | StoredUser[];
  const users: StoredUser[] = Array.isArray(json) ? json : (json.users ?? []);

  const enteredUserLower = username.trim().toLowerCase();
  const hashed = await sha256Hex(password);

  // Try plain-text first (legacy), then hashed
  let u = users.find(
    (x) => (x.username ?? "").toLowerCase() === enteredUserLower && x.password === password,
  );
  if (!u) {
    u = users.find(
      (x) => (x.username ?? "").toLowerCase() === enteredUserLower && x.password === hashed,
    );
  }

  if (!u) throw new Error("Invalid username or password");

  const session: SessionUser = { name: u.name, username: u.username, role: u.role };
  setSessionUser(session);
  return session;
}

export async function changePassword(
  username: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  // Verify current password first
  await login(username, currentPassword);

  const newHash = await sha256Hex(newPassword);
  const url = `${WEB_APP_URL}?action=updatePassword&payload=${encodeURIComponent(
    JSON.stringify({ username, password: newHash }),
  )}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not reach server");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to update password");
}

export async function adminResetPassword(
  targetUsername: string,
  newPassword: string,
): Promise<void> {
  const newHash = await sha256Hex(newPassword);
  const url = `${WEB_APP_URL}?action=updatePassword&payload=${encodeURIComponent(
    JSON.stringify({ username: targetUsername, password: newHash }),
  )}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not reach server");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to reset password");
}