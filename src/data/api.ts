const API_BASE =
  import.meta.env.VITE_API_BASE || "";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChapterCatalog = {
  grade: string;
  board?: string;
  subjects: Array<{
    name: string;
    chapters: Array<{
      id: string;
      chapter: string;
    }>;
  }>;
};

export type ChapterDetail = {
  grade: string;
  board: string;
  subject: string;
  chapterId: string;
  chapter: string;
  officialReference: string;
  overview: string;
  learningGoals: string[];
  focusAreas: string[];
  readingPassages: string[];
  readingBlocks: Array<{
    title: string;
    text: string;
  }>;
  sourceLinks?: Record<string, string>;
};

export type ChapterQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type ChapterSummary = {
  chapter: string;
  subject: string;
  grade: string;
  topicCount: number;
  questionCount: number;
  summary: string;
  keyPoints: string[];
  formulas: string[];
  studyTips: string[];
  practiceFocus: string[];
};

export const requestDoubtSolve = async (payload: {
  language: string;
  grade: string;
  subject: string;
  chapter?: string;
  question: string;
  history: ChatMessage[];
}) => {
  const response = await fetch(`${API_BASE}/api/ai/doubt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch doubt answer.");
  }
  return response.json();
};

export const requestLevelAnalysis = async (payload: {
  language: string;
  grade: string;
  subject: string;
  chapter?: string;
  diagnosticAnswers: Array<{
    question: string;
    correctAnswer: string;
    studentAnswer: string;
  }>;
}) => {
  const response = await fetch(`${API_BASE}/api/ai/level`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to analyze level.");
  }
  return response.json();
};

export const requestNextQuestion = async (payload: {
  language: string;
  grade: string;
  subject: string;
  chapter?: string;
  level: string;
  history: string[];
}) => {
  const response = await fetch(`${API_BASE}/api/ai/next-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch next question.");
  }
  return response.json();
};

export const fetchChapterCatalog = async (grade: string): Promise<ChapterCatalog> => {
  const response = await fetch(
    `${API_BASE}/api/content/catalog?grade=${encodeURIComponent(grade)}`
  );
  if (!response.ok) {
    throw new Error("Failed to load chapter catalog.");
  }
  return response.json();
};

export const requestChapterSummary = async (payload: {
  language: string;
  grade: string;
  subject: string;
  chapter: string;
}): Promise<ChapterSummary> => {
  const response = await fetch(`${API_BASE}/api/ai/chapter-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to summarize chapter.");
  }
  return response.json();
};

export const fetchChapterDetail = async (payload: {
  grade: string;
  subject: string;
  chapter: string;
}): Promise<ChapterDetail> => {
  const query = new URLSearchParams(payload).toString();
  const response = await fetch(`${API_BASE}/api/content/chapter?${query}`);
  if (!response.ok) {
    throw new Error("Failed to load chapter details.");
  }
  return response.json();
};

export const requestChapterQuiz = async (payload: {
  language: string;
  grade: string;
  subject: string;
  chapter: string;
  history: string[];
}): Promise<{
  chapter: string;
  subject: string;
  grade: string;
  questions: ChapterQuizQuestion[];
}> => {
  const response = await fetch(`${API_BASE}/api/ai/chapter-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to generate chapter quiz.");
  }
  return response.json();
};

export const requestGeneralAnswer = async (payload: {
  language: string;
  question: string;
  history: ChatMessage[];
}) => {
  const response = await fetch(`${API_BASE}/api/ai/general`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to fetch AI answer.");
  }
  return response.json();
};
