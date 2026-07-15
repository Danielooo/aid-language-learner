export type LearningTopicItem = {
  topic: string;
  exerciseCount: number;
  isActive: boolean;
  isOwn: boolean;
  dueCount: number;
};

export type LearningTopicsResponse = {
  topics: LearningTopicItem[];
  activeCount: number;
};
