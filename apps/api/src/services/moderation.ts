import type { Message, ModerationFlag } from "@clarity/shared";
import { createId, nowIso } from "../lib/ids.js";

const moderationPatterns = [
  {
    category: "sexual_pressure",
    severity: "high",
    pattern: /(send nudes|you owe me sex|don't say no|prove you want me)/i
  },
  {
    category: "fetishisation",
    severity: "medium",
    pattern: /(always wanted to date an autistic|adhd girls are so fun|your autism is hot)/i
  },
  {
    category: "harassment",
    severity: "medium",
    pattern: /(idiot|crazy bitch|what is wrong with you|you're pathetic)/i
  }
] as const;

export function analyzeMessageForModeration(message: Message) {
  const flags: ModerationFlag[] = [];

  moderationPatterns.forEach((entry) => {
    const match = message.body.match(entry.pattern);

    if (!match) {
      return;
    }

    flags.push({
      id: createId("flag"),
      targetType: "message",
      targetId: message.id,
      category: entry.category,
      severity: entry.severity,
      status: "open",
      source: "pattern_match",
      evidenceSnippet: match[0],
      notes: "Bounded local pattern match. Human review is still required before enforcement.",
      createdAt: nowIso()
    });
  });

  return {
    moderationState: flags.length > 0 ? "review" : "clear",
    flags
  } as const;
}
