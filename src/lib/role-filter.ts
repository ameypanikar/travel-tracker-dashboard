import { getSessionUser } from "./auth";

const FULL_ACCESS_ROLES = ["system manager", "owner", "hr", "accounts"];

export function isAssignedToMe(assignedto: string | undefined, name: string): boolean {
  if (!assignedto) return false;
  const target = name.trim().toLowerCase();
  if (!target) return false;
  return assignedto
    .split(/[,;/]+/)
    .map((s) => s.trim().toLowerCase())
    .some((s) => s === target || s.includes(target) || target.includes(s));
}

export function filterByRole<T extends Record<string, unknown>>(items: T[]): T[] {
  const user = getSessionUser();
  if (!user) return items;
  const role = (user.role || "").trim().toLowerCase();
  if (FULL_ACCESS_ROLES.includes(role)) return items;
  return items.filter((it) =>
    isAssignedToMe((it as unknown as Record<string, string>).assignedto, user.name),
  );
}
