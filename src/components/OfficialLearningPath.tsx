import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "../data/auth";
import {
  fetchChapterCatalog,
  fetchChapterDetail,
  requestChapterQuiz,
  requestChapterSummary,
  type ChapterCatalog,
  type ChapterDetail,
  type ChapterQuizQuestion
} from "../data/api";
import { languageOptions } from "../data/languages";
import { submitStudentAttempt } from "../data/apiClient";

type ChapterSummary = {
  summary: string;
  keyPoints: string[];
  studyTips: string[];
  practiceFocus: string[];
};

type OfficialLearningPathProps = {
  user: AuthUser;
  onActivitySaved?: () => Promise<void> | void;
};

const readStorageKey = (userId: number) => `official_read_${userId}`;
const completeStorageKey = (userId: number) => `official_complete_${userId}`;

const makeChapterKey = (grade: string, subject: string, chapter: string) =>
  `${grade}::${subject}::${chapter}`;

const loadKeyMap = (storageKey: string) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveKeyMap = (storageKey: string, value: Record<string, boolean>) => {
  localStorage.setItem(storageKey, JSON.stringify(value));
};

const OfficialLearningPath = ({ user, onActivitySaved }: OfficialLearningPathProps) => {
  const { i18n } = useTranslation();
  const [catalog, setCatalog] = useState<ChapterCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedSubject, setSelectedSubject] = useState("");
  const [activeChapter, setActiveChapter] = useState<ChapterDetail | null>(null);
  const [chapterSummary, setChapterSummary] = useState<ChapterSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<ChapterQuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [questionStart, setQuestionStart] = useState<number | null>(null);

  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const languageLabel =
    languageOptions.find((option) => option.code === i18n.language)?.label || "English";

  useEffect(() => {
    if (!user.id || !user.grade) return;
    setReadMap(loadKeyMap(readStorageKey(user.id)));
    setCompletedMap(loadKeyMap(completeStorageKey(user.id)));
  }, [user.id, user.grade]);

  useEffect(() => {
    if (!user.grade) return;
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setError("");
      try {
        const nextCatalog = await fetchChapterCatalog(user.grade || "6");
        setCatalog(nextCatalog);
      } catch (loadError: any) {
        setCatalog(null);
        setError(loadError.message || "Unable to load the official learning path.");
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalog();
  }, [user.grade]);

  useEffect(() => {
    if (!catalog?.subjects.length) {
      setSelectedSubject("");
      return;
    }

    if (!catalog.subjects.some((item) => item.name === selectedSubject)) {
      setSelectedSubject(catalog.subjects[0].name);
    }
  }, [catalog, selectedSubject]);

  const subjectOptions = catalog?.subjects || [];
  const visibleChapters = useMemo(() => {
    return subjectOptions.find((item) => item.name === selectedSubject)?.chapters || [];
  }, [selectedSubject, subjectOptions]);

  const currentChapterKey = activeChapter
    ? makeChapterKey(activeChapter.grade, activeChapter.subject, activeChapter.chapter)
    : "";
  const hasReadActiveChapter = currentChapterKey ? Boolean(readMap[currentChapterKey]) : false;

  const completedCount = useMemo(() => {
    return Object.values(completedMap).filter(Boolean).length;
  }, [completedMap]);

  const totalChapters = useMemo(() => {
    return subjectOptions.reduce((sum, subject) => sum + subject.chapters.length, 0);
  }, [subjectOptions]);

  const openChapter = async (subject: string, chapter: string) => {
    if (!user.grade) return;
    setDetailLoading(true);
    setSummaryLoading(true);
    setError("");
    setQuizQuestions([]);
    setQuizIndex(0);
    setSelectedOption("");
    setFeedback("");
    setAnswerSubmitted(false);
    setQuestionStart(null);
    try {
      const [detailResult, summaryResult] = await Promise.all([
        fetchChapterDetail({
          grade: user.grade,
          subject,
          chapter
        }),
        requestChapterSummary({
          language: languageLabel,
          grade: user.grade,
          subject,
          chapter
        }).catch(() => null)
      ]);

      setActiveChapter(detailResult);
      setChapterSummary(
        summaryResult
          ? {
              summary: summaryResult.summary || detailResult.overview,
              keyPoints: Array.isArray(summaryResult.keyPoints) ? summaryResult.keyPoints : [],
              studyTips: Array.isArray(summaryResult.studyTips) ? summaryResult.studyTips : [],
              practiceFocus: Array.isArray(summaryResult.practiceFocus)
                ? summaryResult.practiceFocus
                : []
            }
          : {
              summary: detailResult.overview,
              keyPoints: detailResult.focusAreas,
              studyTips: detailResult.learningGoals,
              practiceFocus: detailResult.focusAreas
            }
      );
    } catch (loadError: any) {
      setActiveChapter(null);
      setChapterSummary(null);
      setError(loadError.message || "Unable to open this chapter right now.");
    } finally {
      setDetailLoading(false);
      setSummaryLoading(false);
    }
  };

  const markChapterRead = () => {
    if (!activeChapter || !user.id) return;
    const chapterKey = makeChapterKey(activeChapter.grade, activeChapter.subject, activeChapter.chapter);
    const nextMap = {
      ...readMap,
      [chapterKey]: true
    };
    setReadMap(nextMap);
    saveKeyMap(readStorageKey(user.id), nextMap);
  };

  const startQuiz = async () => {
    if (!activeChapter || !hasReadActiveChapter) return;
    setQuizLoading(true);
    setError("");
    setFeedback("");
    setSelectedOption("");
    setAnswerSubmitted(false);
    try {
      const result = await requestChapterQuiz({
        language: languageLabel,
        grade: activeChapter.grade,
        subject: activeChapter.subject,
        chapter: activeChapter.chapter,
        history: []
      });
      setQuizQuestions(Array.isArray(result.questions) ? result.questions : []);
      setQuizIndex(0);
      setQuestionStart(Date.now());
    } catch (quizError: any) {
      setQuizQuestions([]);
      setError(quizError.message || "Unable to generate a quiz for this chapter.");
    } finally {
      setQuizLoading(false);
    }
  };

  const currentQuestion = quizQuestions[quizIndex];

  const submitQuizAnswer = async () => {
    if (!activeChapter || !currentQuestion || !selectedOption) return;
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const timeSpentSec = questionStart
      ? Math.max(1, Math.round((Date.now() - questionStart) / 1000))
      : 0;

    await submitStudentAttempt({
      chapterId: null,
      subject: `${activeChapter.subject}: ${activeChapter.chapter}`,
      correct: isCorrect,
      points: isCorrect ? 10 : 2,
      timeSpentSec,
      difficulty: activeChapter.grade,
      question: currentQuestion.question,
      source: "official-curriculum"
    });

    if (onActivitySaved) {
      await onActivitySaved();
    }

    setFeedback(
      `${isCorrect ? "Correct!" : "Not quite."} ${currentQuestion.explanation || ""}`.trim()
    );
    setAnswerSubmitted(true);
  };

  const nextQuizQuestion = () => {
    if (!activeChapter || !user.id) return;
    const nextIndex = quizIndex + 1;
    if (nextIndex < quizQuestions.length) {
      setQuizIndex(nextIndex);
      setSelectedOption("");
      setFeedback("");
      setAnswerSubmitted(false);
      setQuestionStart(Date.now());
      return;
    }

    const chapterKey = makeChapterKey(activeChapter.grade, activeChapter.subject, activeChapter.chapter);
    const nextCompletedMap = {
      ...completedMap,
      [chapterKey]: true
    };
    setCompletedMap(nextCompletedMap);
    saveKeyMap(completeStorageKey(user.id), nextCompletedMap);
    setFeedback("Quiz finished. You can revise the summary or open another chapter.");
    setQuizQuestions([]);
    setQuizIndex(0);
    setSelectedOption("");
    setAnswerSubmitted(false);
    setQuestionStart(null);
  };

  return (
    <div className="section">
      <div className="card">
        <div className="summary-header">
          <div>
            <h3>Official Learning Path</h3>
            <p>
              Class {user.grade} curriculum aligned with CBSE/NCERT-supported subjects. Read the
              chapter first, then unlock the quiz.
            </p>
          </div>
          <div className="stat-row">
            <span className="stat-pill">Completed: {completedCount}</span>
            <span className="stat-pill">Total Chapters: {totalChapters}</span>
          </div>
        </div>

        {catalogLoading ? <p className="muted">Loading grade-wise syllabus...</p> : null}
        {error ? <p className="muted">{error}</p> : null}

        <div className="subject-tabs">
          {subjectOptions.map((subject) => (
            <button
              key={subject.name}
              className={`subject-tab${selectedSubject === subject.name ? " active" : ""}`}
              onClick={() => setSelectedSubject(subject.name)}
            >
              {subject.name}
            </button>
          ))}
        </div>

        <div className="card-grid">
          {visibleChapters.map((chapter) => {
            const chapterKey = makeChapterKey(user.grade || "6", selectedSubject, chapter.chapter);
            const isRead = Boolean(readMap[chapterKey]);
            const isComplete = Boolean(completedMap[chapterKey]);
            return (
              <div className="card" key={chapter.id}>
                <h4>{chapter.chapter}</h4>
                <p className="muted">{selectedSubject}</p>
                <div className="tag-list">
                  <span className="tag">{isRead ? "Read" : "Not read"}</span>
                  <span className="tag">{isComplete ? "Quiz done" : "Quiz pending"}</span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => openChapter(selectedSubject, chapter.chapter)}
                >
                  Open Chapter
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {detailLoading ? <p className="muted">Opening chapter...</p> : null}

      {activeChapter ? (
        <div className="official-learning-layout">
          <div className="card">
            <h3>{activeChapter.chapter}</h3>
            <p className="muted">
              {activeChapter.subject} • Class {activeChapter.grade}
            </p>
            <p>{activeChapter.overview}</p>

            <div className="section">
              <h4>Chapter Reading</h4>
              <div className="reading-paragraphs">
                {activeChapter.readingPassages.map((paragraph, index) => (
                  <p key={`${activeChapter.chapter}-reading-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="section">
              <h4>Reading Goals</h4>
              <ul>
                {activeChapter.learningGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </div>

            <div className="section">
              <h4>Study Tips</h4>
              <div className="card-grid">
                {activeChapter.readingBlocks.map((block) => (
                  <div className="quiz-card" key={block.title}>
                    <h4>{block.title}</h4>
                    <p>{block.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h4>Focus Areas</h4>
              <ul>
                {activeChapter.focusAreas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-actions">
              <button className="btn btn-secondary" onClick={markChapterRead}>
                {hasReadActiveChapter ? "Chapter marked as read" : "Mark as Read"}
              </button>
              <button
                className="btn btn-primary"
                onClick={startQuiz}
                disabled={!hasReadActiveChapter || quizLoading}
              >
                {quizLoading ? "Generating Quiz..." : "Start Chapter Quiz"}
              </button>
            </div>
          </div>

          <div className="card">
            <h3>AI Chapter Summary</h3>
            {summaryLoading ? (
              <p className="muted">Building a quick summary...</p>
            ) : chapterSummary ? (
              <>
                <p>{chapterSummary.summary}</p>
                <h4>Key Points</h4>
                <ul>
                  {chapterSummary.keyPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>Study Tips</h4>
                <ul>
                  {chapterSummary.studyTips.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>Practice Focus</h4>
                <ul>
                  {chapterSummary.practiceFocus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">Open a chapter to load its summary.</p>
            )}
          </div>
        </div>
      ) : null}

      {currentQuestion ? (
        <div className="card">
          <h3>Chapter Quiz</h3>
          <p className="muted">
            Question {quizIndex + 1} of {quizQuestions.length}
          </p>
          <p>{currentQuestion.question}</p>
          <div className="quiz-options">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                className={`option-btn${selectedOption === option ? " selected" : ""}`}
                onClick={() => setSelectedOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="summary-actions">
            <button
              className="btn btn-secondary"
              onClick={submitQuizAnswer}
              disabled={!selectedOption || answerSubmitted}
            >
              Submit Answer
            </button>
            <button
              className="btn btn-primary"
              onClick={nextQuizQuestion}
              disabled={!answerSubmitted}
            >
              Next
            </button>
          </div>
          {feedback ? <p className="muted">{feedback}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default OfficialLearningPath;
