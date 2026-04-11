export const demoUsers = [
  { id: "user-lara", label: "Lara (AuDHD)" },
  { id: "user-jonas", label: "Jonas (ADHD)" },
  { id: "user-merve", label: "Merve (Autism)" },
  { id: "user-alex", label: "Alex (ADHD)" }
] as const;

export const defaultDemoUserId = demoUsers[0].id;

export function splitCommaList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
