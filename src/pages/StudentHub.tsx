import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Section from "../components/Section";
import OfficialLearningPath from "../components/OfficialLearningPath";
import { clearAuth, getUser } from "../data/auth";
import { requestDoubtSolve } from "../data/api";
import { languageOptions } from "../data/languages";
import {
  fetchStudentAssignments,
  fetchStudentAttempts,
  loginStudent,
  submitStudentAttempt
} from "../data/apiClient";

type Chapter = {
  id: number;
  grade: string;
  subject: string;
  title: string;
  summary: string;
  questions: Array<{
    id: number;
    prompt: string;
    options: string[];
    correctIndex: number;
  }>;
};

type Assignment = {
  assignmentId: number;
  assignedAt: number;
  chapter: Chapter;
};

type Attempt = {
  id: number;
  chapterId: number | null;
  subject: string;
  correct: boolean;
  points: number;
  timeSpentSec: number;
  difficulty: string;
  question: string;
  timestamp: number;
};

const SESSION_KEY = "rlq_session_seconds";
const SESSION_DATE_KEY = "rlq_session_date";
const WARNING_DATE_KEY = "rlq_warning_date";

const StudentHub = () => {
  const { t, i18n } = useTranslation();
  const [authUser, setAuthUser] = useState(() => getUser());
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [questionStart, setQuestionStart] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  const [doubtInput, setDoubtInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ role: "user" | "assistant"; text: string }>>(
    []
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const loadStudentData = async () => {
    const [assignmentData, attemptData] = await Promise.all([
      fetchStudentAssignments(),
      fetchStudentAttempts()
    ]);
    setAssignments(assignmentData);
    const normalizedAttempts = attemptData.map((item: any) => ({
      id: Number(item.id),
      chapterId: item.chapter_id ? Number(item.chapter_id) : null,
      subject: item.subject || "",
      correct: Boolean(item.correct),
      points: Number(item.points || 0),
      timeSpentSec: Number(item.time_spent_sec || 0),
      difficulty: item.difficulty || "",
      question: item.question || "",
      timestamp: Number(item.timestamp || 0)
    }));
    setAttempts(normalizedAttempts);
  };

  useEffect(() => {
    if (authUser?.role === "student") {
      loadStudentData();
      const today = new Date().toISOString().slice(0, 10);
      const storedDate = localStorage.getItem(`${SESSION_DATE_KEY}_${authUser.id}`);
      if (storedDate !== today) {
        localStorage.setItem(`${SESSION_DATE_KEY}_${authUser.id}`, today);
        localStorage.setItem(`${SESSION_KEY}_${authUser.id}`, "0");
        setSessionSeconds(0);
      } else {
        const saved = localStorage.getItem(`${SESSION_KEY}_${authUser.id}`);
        setSessionSeconds(saved ? Number(saved) : 0);
      }
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.id) return;
    let lastTick = Date.now();
    const interval = setInterval(() => {
      if (document.hidden) {
        lastTick = Date.now();
        return;
      }
      const now = Date.now();
      const diff = Math.round((now - lastTick) / 1000);
      if (diff > 0) {
        setSessionSeconds((prev) => {
          const next = prev + diff;
          localStorage.setItem(`${SESSION_KEY}_${authUser.id}`, String(next));
          return next;
        });
      }
      lastTick = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const shownDate = localStorage.getItem(`${WARNING_DATE_KEY}_${authUser.id}`);
    if (sessionSeconds >= 3600 && shownDate !== today) {
      setShowWarning(true);
      localStorage.setItem(`${WARNING_DATE_KEY}_${authUser.id}`, today);
    }
  }, [sessionSeconds, authUser?.id]);

  const assignedChapters = useMemo(() => assignments.map((item) => item.chapter), [
    assignments
  ]);

  const accuracy =
    attempts.length === 0
      ? 0
      : Math.round(
          (attempts.filter((attempt) => attempt.correct).length / attempts.length) * 100
        );

  const completedChapters = useMemo(() => {
    const counts = new Map<number, number>();
    attempts.forEach((attempt) => {
      if (attempt.chapterId) {
        counts.set(attempt.chapterId, (counts.get(attempt.chapterId) || 0) + 1);
      }
    });
    return assignedChapters.filter((chapter) => {
      const count = counts.get(chapter.id) || 0;
      return count >= chapter.questions.length;
    }).length;
  }, [attempts, assignedChapters]);

  const totalStars = attempts.reduce((sum, attempt) => sum + attempt.points, 0);

  const startChapter = (chapter: Chapter) => {
    setActiveChapter(chapter);
    setQuestionIndex(0);
    setSelectedOption(null);
    setFeedback("");
    setSubmitted(false);
    setQuestionStart(Date.now());
    setExplanation("");
  };

  const currentQuestion = activeChapter?.questions[questionIndex];

  const submitAnswer = async () => {
    if (!activeChapter || selectedOption === null || !currentQuestion) return;
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    const timeSpentSec = questionStart
      ? Math.max(1, Math.round((Date.now() - questionStart) / 1000))
      : 0;
    await submitStudentAttempt({
      chapterId: activeChapter.id,
      subject: activeChapter.subject,
      correct: isCorrect,
      points: isCorrect ? 10 : 2,
      timeSpentSec,
      difficulty: activeChapter.grade,
      question: currentQuestion.prompt,
      source: "chapter"
    });
    const attemptData = await fetchStudentAttempts();
    const normalizedAttempts = attemptData.map((item: any) => ({
      id: Number(item.id),
      chapterId: item.chapter_id ? Number(item.chapter_id) : null,
      subject: item.subject || "",
      correct: Boolean(item.correct),
      points: Number(item.points || 0),
      timeSpentSec: Number(item.time_spent_sec || 0),
      difficulty: item.difficulty || "",
      question: item.question || "",
      timestamp: Number(item.timestamp || 0)
    }));
    setAttempts(normalizedAttempts);
    setFeedback(isCorrect ? t("student.correct") : t("student.incorrect"));
    setSubmitted(true);
  };

  const nextQuestion = () => {
    if (!activeChapter) return;
    const nextIndex = questionIndex + 1;
    if (nextIndex < activeChapter.questions.length) {
      setQuestionIndex(nextIndex);
      setSelectedOption(null);
      setFeedback("");
      setSubmitted(false);
      setQuestionStart(Date.now());
      setExplanation("");
    } else {
      setActiveChapter(null);
    }
  };

  const explainQuestion = async () => {
    if (!currentQuestion || !authUser) return;
    const subject = activeChapter?.subject || "Math";
    const languageLabel =
      languageOptions.find((option) => option.code === i18n.language)?.label || "English";
    setExplainLoading(true);
    setExplanation("");
    try {
      const prompt = [
        `Question: ${currentQuestion.prompt}`,
        `Options: ${currentQuestion.options.join(", ")}`,
        "Explain the concept in simple steps for a student.",
        "Do not reveal the answer directly."
      ].join("\n");
      const result = await requestDoubtSolve({
        language: languageLabel,
        grade: authUser.grade || "6",
        subject,
        chapter: activeChapter?.title || "",
        question: prompt,
        history: []
      });
      setExplanation(result.answer || t("student.aiFallback"));
    } catch (error) {
      setExplanation(t("student.aiFallback"));
    } finally {
      setExplainLoading(false);
    }
  };

  const sendDoubt = async () => {
    if (!doubtInput.trim() || !authUser) return;
    const subject = activeChapter?.subject || "Math";
    const languageLabel =
      languageOptions.find((option) => option.code === i18n.language)?.label || "English";
    setChatLog((prev) => [...prev, { role: "user", text: doubtInput }]);
    setChatLoading(true);
    try {
      const result = await requestDoubtSolve({
        language: languageLabel,
        grade: authUser.grade || "6",
        subject,
        chapter: activeChapter?.title || "",
        question: doubtInput,
        history: []
      });
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: result.answer || t("student.aiFallback") }
      ]);
    } catch (error) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: t("student.aiFallback") }
      ]);
    } finally {
      setChatLoading(false);
      setDoubtInput("");
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const user = await loginStudent(loginUsername, loginPin);
      setAuthUser(user);
    } catch (error: any) {
      setLoginError(error.message || "Login failed.");
    }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAssignments([]);
    setAttempts([]);
  };

  if (!authUser || authUser.role !== "student") {
    return (
      <Section title={t("student.loginTitle")}>
        <div className="card form-grid">
          <input
            className="input"
            placeholder={t("student.username")}
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
          />
          <input
            className="input"
            placeholder={t("student.pin")}
            value={loginPin}
            type="password"
            onChange={(event) => setLoginPin(event.target.value)}
          />
          {loginError && <p className="muted">{loginError}</p>}
          <button className="btn btn-primary" onClick={handleLogin}>
            {t("student.login")}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title={t("student.title")}>
      <p>{t("student.subtitle")}</p>
      <button className="btn btn-secondary" onClick={handleLogout}>
        {t("student.logout")}
      </button>

      <div className="card-grid">
        <div className="card">
          <h3>{t("student.performanceTitle")}</h3>
          <div className="stat-row">
            <span className="stat-pill">{t("student.accuracy")}: {accuracy}%</span>
            <span className="stat-pill">{t("student.completed")}: {completedChapters}</span>
            <span className="stat-pill">{t("student.stars")}: {totalStars}</span>
          </div>
        </div>
        <div className="card">
          <h3>{t("student.timerTitle")}</h3>
          <p className="muted">
            {t("student.timerNote")} {Math.floor(sessionSeconds / 60)} {t("student.minutes")}
          </p>
        </div>
      </div>

      <OfficialLearningPath user={authUser} onActivitySaved={loadStudentData} />

      <div className="section">
        <h3>Teacher Assigned Practice</h3>
        {assignedChapters.length === 0 ? (
          <p className="muted">{t("student.noAssignments")}</p>
        ) : (
          <div className="card-grid">
            {assignedChapters.map((chapter) => (
              <div className="card" key={chapter.id}>
                <h4>{chapter.title}</h4>
                <p className="muted">
                  G{chapter.grade} - {chapter.subject}
                </p>
                <p>{chapter.summary}</p>
                <button className="btn btn-primary" onClick={() => startChapter(chapter)}>
                  {t("student.startChapter")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeChapter && currentQuestion && (
        <div className="card">
          <h3>{activeChapter.title}</h3>
          <p>{currentQuestion.prompt}</p>
          <button
            className="btn btn-secondary"
            onClick={explainQuestion}
            disabled={explainLoading}
          >
            {explainLoading ? t("student.thinking") : t("student.explain")}
          </button>
          {explanation && <p className="muted">{explanation}</p>}
          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => (
              <button
                key={`${currentQuestion.id}-${index}`}
                className={`option-btn${selectedOption === index ? " selected" : ""}`}
                onClick={() => setSelectedOption(index)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            className="btn btn-secondary"
            onClick={submitAnswer}
            disabled={selectedOption === null || submitted}
          >
            {t("student.submitAnswer")}
          </button>
          {feedback && <p className="muted">{feedback}</p>}
          <button className="btn btn-primary" onClick={nextQuestion} disabled={!submitted}>
            {t("student.next")}
          </button>
        </div>
      )}

      <div className="card">
        <h3>{t("student.aiTitle")}</h3>
        <p>{t("student.aiNote")}</p>
        <div className="chat-box">
          {chatLog.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`chat-message ${item.role}`}>
              <div className="chat-bubble">{item.text}</div>
            </div>
          ))}
        </div>
        <div className="tutor-controls">
          <input
            className="input"
            value={doubtInput}
            placeholder={t("student.aiPlaceholder")}
            onChange={(event) => setDoubtInput(event.target.value)}
          />
          <button className="btn btn-primary" onClick={sendDoubt} disabled={chatLoading}>
            {chatLoading ? t("student.thinking") : t("student.send")}
          </button>
        </div>
      </div>

      {showWarning && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{t("student.warningTitle")}</h3>
            <p>{t("student.warningText")}</p>
            <button className="btn btn-primary" onClick={() => setShowWarning(false)}>
              {t("student.warningButton")}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
};

export default StudentHub;
