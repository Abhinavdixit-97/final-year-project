import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { diagnosticBank } from "../data/diagnosticQuestions";
import { languageOptions } from "../data/languages";
import {
  fetchChapterCatalog,
  requestDoubtSolve,
  requestLevelAnalysis,
  requestNextQuestion,
  ChatMessage
} from "../data/api";
import { loadAttempts, saveAttempt } from "../data/analytics";
import BadgeMeter from "./BadgeMeter";
import TeacherGrowthPanel from "./TeacherGrowthPanel";

type QuizQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation?: string;
  difficultyTag?: string;
};

const gradeOptions = ["6", "7", "8", "9", "10", "11", "12"];
const subjectOptions = [
  "Math",
  "Science",
  "English",
  "General Knowledge",
  "Moral Science"
];

const TutorWidget = () => {
  const { t, i18n } = useTranslation();
  const [grade, setGrade] = useState("6");
  const [subject, setSubject] = useState("Math");
  const [chapter, setChapter] = useState("");
  const [chapterOptions, setChapterOptions] = useState<string[]>([]);
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<
    Array<{ question: string; correctAnswer: string; studentAnswer: string }>
  >([]);
  const [diagnosticActive, setDiagnosticActive] = useState(false);
  const [level, setLevel] = useState<string>("");
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [nextQuestion, setNextQuestion] = useState<QuizQuestion | null>(null);
  const [nextAnswer, setNextAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [doubtInput, setDoubtInput] = useState("");
  const [attempts, setAttempts] = useState(() => loadAttempts());
  const [questionStart, setQuestionStart] = useState<number | null>(null);

  useEffect(() => {
    setChapter("");
    setChapterOptions([]);
    fetchChapterCatalog(grade).then((catalog) => {
      const found = catalog.subjects.find((s) => s.name === subject);
      const chapters = found ? found.chapters.map((c) => c.chapter) : [];
      setChapterOptions(chapters);
      setChapter(chapters[0] || "");
    }).catch(() => {
      setChapterOptions([]);
      setChapter("");
    });
  }, [grade, subject]);

  const diagnosticQuestions = useMemo(() => {
    return diagnosticBank[subject] || diagnosticBank.Math;
  }, [subject]);

  const currentQuestion = diagnosticQuestions[diagnosticIndex];

  const languageLabel =
    languageOptions.find((option) => option.code === i18n.language)?.label ||
    "English";

  const resetDiagnostic = () => {
    setDiagnosticIndex(0);
    setSelectedOption("");
    setDiagnosticAnswers([]);
    setLevel("");
    setNextQuestion(null);
    setFeedback("");
    setPoints(0);
    setBadges([]);
    setHistory([]);
    setChatMessages([]);
    setQuestionStart(null);
  };

  const startDiagnostic = () => {
    resetDiagnostic();
    setDiagnosticActive(true);
  };

  const submitDiagnosticAnswer = async () => {
    if (!selectedOption) return;
    const nextAnswers = [
      ...diagnosticAnswers,
      {
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer,
        studentAnswer: selectedOption
      }
    ];
    setDiagnosticAnswers(nextAnswers);
    setSelectedOption("");

    if (diagnosticIndex + 1 < diagnosticQuestions.length) {
      setDiagnosticIndex(diagnosticIndex + 1);
      return;
    }

    setDiagnosticActive(false);
    setLoadingLevel(true);
    try {
      const result = await requestLevelAnalysis({
        language: languageLabel,
        grade,
        subject,
        chapter,
        diagnosticAnswers: nextAnswers
      });
      setLevel(result.level || "beginner");
    } catch (error) {
      const correct = nextAnswers.filter(
        (item) =>
          item.studentAnswer.trim().toLowerCase() ===
          item.correctAnswer.trim().toLowerCase()
      ).length;
      const percent = (correct / nextAnswers.length) * 100;
      setLevel(percent >= 75 ? "advanced" : percent >= 45 ? "intermediate" : "beginner");
    } finally {
      setLoadingLevel(false);
    }
  };

  const updateBadges = (newPoints: number) => {
    const earned: string[] = [];
    if (newPoints >= 30) earned.push("Bronze");
    if (newPoints >= 60) earned.push("Silver");
    if (newPoints >= 90) earned.push("Gold");
    setBadges(earned);
  };

  const fetchNextQuestion = async () => {
    if (!level) return;
    setLoadingNext(true);
    setFeedback("");
    setNextAnswer("");
    try {
      const result = await requestNextQuestion({
        language: languageLabel,
        grade,
        subject,
        chapter,
        level,
        history
      });
      setNextQuestion(result);
      setHistory((prev) => [...prev, result.question]);
      setQuestionStart(Date.now());
    } catch (error) {
      setNextQuestion(null);
      setFeedback("Unable to fetch a new question.");
    } finally {
      setLoadingNext(false);
    }
  };

  const submitNextAnswer = () => {
    if (!nextQuestion || !nextAnswer) return;
    const isCorrect = nextAnswer === nextQuestion.correctAnswer;
    const nextPoints = points + (isCorrect ? 10 : 2);
    setPoints(nextPoints);
    updateBadges(nextPoints);
    setFeedback(isCorrect ? t("tutor.correct") : t("tutor.incorrect"));
    const timeSpentSec = questionStart
      ? Math.max(1, Math.round((Date.now() - questionStart) / 1000))
      : 0;
    const id =
      (globalThis.crypto && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`);
    saveAttempt({
      id,
      subject,
      correct: isCorrect,
      points: isCorrect ? 10 : 2,
      timestamp: Date.now(),
      timeSpentSec,
      difficulty: nextQuestion.difficultyTag || level,
      question: nextQuestion.question,
      source: "ai"
    });
    setAttempts(loadAttempts());
    setQuestionStart(null);
  };

  const sendDoubt = async () => {
    if (!doubtInput.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: doubtInput };
    const updatedHistory = [...chatMessages, userMessage];
    setChatMessages(updatedHistory);
    setDoubtInput("");
    setLoadingChat(true);
    try {
      const result = await requestDoubtSolve({
        language: languageLabel,
        grade,
        subject,
        chapter,
        question: userMessage.content,
        history: updatedHistory
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer || "" }
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, the AI helper is not available right now."
        }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="tutor-panel">
      <div className="tutor-controls">
        <label>
          {t("tutor.grade")}
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {gradeOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("tutor.subject")}
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjectOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("tutor.chapter")}
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} disabled={chapterOptions.length === 0}>
            {chapterOptions.length === 0
              ? <option value="">Loading...</option>
              : chapterOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
            }
          </select>
        </label>
        <div>
          <strong>{t("tutor.level")}:</strong>{" "}
          <span className="badge">
            {loadingLevel ? t("tutor.loading") : level || "—"}
          </span>
        </div>
      </div>

      <BadgeMeter points={points} badges={badges} />

      <div className="quiz-card">
        <h3>{t("tutor.diagnostic")}</h3>
        {!diagnosticActive && (
          <button className="btn btn-primary" onClick={startDiagnostic}>
            {t("tutor.startDiagnostic")}
          </button>
        )}
        {diagnosticActive && (
          <>
            <p>{currentQuestion.question}</p>
            <div className="quiz-options">
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice}
                  className={`option-btn${selectedOption === choice ? " selected" : ""}`}
                  onClick={() => setSelectedOption(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={submitDiagnosticAnswer}>
              Next
            </button>
          </>
        )}
      </div>

      <div className="quiz-card">
        <h3>{t("tutor.nextQuestion")}</h3>
        {nextQuestion ? (
          <>
            <p>{nextQuestion.question}</p>
            <div className="quiz-options">
              {nextQuestion.choices.map((choice) => (
                <button
                  key={choice}
                  className={`option-btn${nextAnswer === choice ? " selected" : ""}`}
                  onClick={() => setNextAnswer(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={submitNextAnswer}>
              Submit
            </button>
            {feedback ? <p className="muted">{feedback}</p> : null}
          </>
        ) : (
          <p className="muted">{t("tutor.noQuestion")}</p>
        )}
        <button className="btn btn-primary" onClick={fetchNextQuestion} disabled={!level}>
          {loadingNext ? t("tutor.loading") : t("tutor.nextQuestion")}
        </button>
      </div>

      <div className="quiz-card">
        <h3>{t("tutor.askDoubt")}</h3>
        <div className="chat-box">
          {chatMessages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
              <div className="chat-bubble">{message.content}</div>
            </div>
          ))}
        </div>
        <div className="tutor-controls">
          <input
            type="text"
            value={doubtInput}
            placeholder={t("tutor.typeDoubt")}
            onChange={(event) => setDoubtInput(event.target.value)}
          />
          <button className="btn btn-primary" onClick={sendDoubt} disabled={loadingChat}>
            {loadingChat ? t("tutor.loading") : t("tutor.send")}
          </button>
        </div>
      </div>

      <div className="callout">
        <strong>{t("tutor.teacherPanel")}</strong>
        <p className="muted">
          {t("tutor.progress")}: {diagnosticAnswers.length} / {diagnosticQuestions.length}
        </p>
      </div>

      <div className="card-grid">
        <TeacherGrowthPanel attempts={attempts} />
      </div>
    </div>
  );
};

export default TutorWidget;
