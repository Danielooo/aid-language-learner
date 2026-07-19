/**
 * Centrale query-key factories voor TanStack Query.
 * Gebruik deze keys voor queries én invalidateQueries.
 */
export const queryKeys = {
  dashboardStats: () => ["dashboard-stats"] as const,

  exerciseProgress: (breakdown?: "topics") =>
    breakdown
      ? (["exercise-progress", { breakdown }] as const)
      : (["exercise-progress"] as const),

  quizTopics: () => ["quiz-topics"] as const,

  quizList: (params: { topic?: string; q?: string }) =>
    ["quiz-list", params] as const,

  quizAttempts: () => ["quiz-attempts"] as const,

  learningTopics: () => ["learning-topics"] as const,

  learningTopic: (groupId: string) =>
    ["learning-topics", groupId] as const,

  communityGroups: () => ["community-groups"] as const,

  communityGroup: (groupId: string) =>
    ["community-groups", groupId] as const,

  communitySubmissions: (status: string) =>
    ["community-submissions", status] as const,

  adminUsers: () => ["admin-users"] as const,

  adminReviews: (status: string) =>
    ["admin-reviews", status] as const,

  exercises: (params: Record<string, string>) =>
    ["exercises", params] as const,

  aiQuota: () => ["ai-quota"] as const,

  tatoebaAudioStats: () => ["tatoeba-audio-stats"] as const,

  tatoebaTopics: () => ["tatoeba-topics"] as const,
} as const;
