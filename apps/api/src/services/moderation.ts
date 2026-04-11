import type { Message, ModerationFlag } from "@project-a-z/shared";
import { createId, nowIso } from "../lib/ids.js";

const moderationPatterns = [
  {
    category: "coercion",
    severity: "high",
    pattern: /(you owe me|don't say no|come now)/i
  },
  {
    category: "spam_or_scam",
    severity: "high",
    pattern: /(send money|cashapp|bitcoin|wire transfer)/i
  },
  {
    category: "unsafe_off_platform_request",
    severity: "medium",
    pattern: /(hotel tonight|come to my place now|private address first)/i
  },
  {
    category: "manipulative_pressure",
    severity: "medium",
    pattern: /(prove you're real|if you cared|reply right now)/i
  }
] as const;

export function analyzeMessageForModeration(message: Message) {
  // TODO: Expand beyond regex patterns after real moderation review data exists.
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
      source: "ai_assist",
      evidenceSnippet: match[0],
      notes: "Bounded regex-based moderation skeleton. Human review is still required.",
      createdAt: nowIso()
    });
  });

  return {
    moderationState: flags.length > 0 ? "review" : "clear",
    flags
  } as const;
}
