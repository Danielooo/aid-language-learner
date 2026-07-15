/** Oefening zoals de quiz-decks die gebruiken. */
export type ExerciseQuizItem = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  created_at: string;
  alternative_translations: string[];
  mp3_url: string | null;
  tatoeba_author: string | null;
  tatoeba_license: string | null;
  tatoeba_attribution_url: string | null;
};

/** Lichte rij voor de custom exercise-picker. */
export type ExercisePickerItem = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
};

export type ExerciseListResponse = {
  exercises: ExercisePickerItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TopicStat = {
  topic: string;
  count: number;
};

export type TopicsResponse = {
  topics: string[];
  stats: TopicStat[];
};
