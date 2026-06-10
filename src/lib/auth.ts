export const USERS_URL =
  "https://script.google.com/macros/s/AKfycbz9vzVzHH6sPpcxaTj7ISrQLEGQ7y59wRsBcVbFdRl1KyNVz7GAFfXd9VycYNKhLG25wg/exec?action=getUsers";

export type SessionUser = { name: string; username: string; role: string };
type StoredUser = SessionUser & { password: string };

const STORAGE_KEY = "loggedInUser";

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

async function sha256Hex(text: string): Promise<string> {
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
  const users: StoredUser[] = Array.isArray(json)
    ? json
    : (json.users ?? []);

  const hashed = await sha256Hex(password);
  const u = users.find(
    (x) =>
      x.username?.toLowerCase() === username.toLowerCase() &&
      (x.password === password || x.password === hashed),
  );
  if (!u) throw new Error("Invalid username or password");
  const session: SessionUser = { name: u.name, username: u.username, role: u.role };
  setSessionUser(session);
  return session;
}
