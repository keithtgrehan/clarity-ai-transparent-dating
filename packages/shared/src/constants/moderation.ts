export const moderationCategories = [
  "harassment",
  "boundary_violation",
  "coercion",
  "fetishization",
  "impersonation",
  "hate_or_bigotry",
  "sexual_content_without_consent",
  "spam_or_scam",
  "manipulative_pressure",
  "unsafe_off_platform_request"
] as const;

export const moderationSeverityLevels = ["low", "medium", "high", "critical"] as const;
export const moderationStatuses = ["open", "in_review", "resolved", "dismissed"] as const;
