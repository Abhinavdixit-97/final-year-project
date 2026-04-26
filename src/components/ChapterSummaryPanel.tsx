import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchChapterCatalog, requestChapterSummary, type ChapterCatalog, type ChapterSummary } from "../data/api";
import { languageOptions } from "../data/languages";

const gradeOptions = ["6", "7", "8", "9", "10", "11", "12"];

const ChapterSummaryPanel = () => {
  const { i18n } = useTranslation();
  const [grade, setGrade] = useState("6");
  const [catalog, setCatalog] = useState<ChapterCatalog | null>(null);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ChapterSummary | null>(null);

  const languageLabel =
    languageOptions.find((option) => option.code === i18n.language)?.label || "English";

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setError("");
      try {
        const nextCatalog = await fetchChapterCatalog(grade);
        setCatalog(nextCatalog);
      } catch (loadError: any) {
        setCatalog(null);
        setError(loadError.message || "Unable to load chapter catalog.");
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalog();
  }, [grade]);

  useEffect(() => {
    if (!catalog?.subjects.length) {
      setSubject("");
      return;
    }

    const hasSubject = catalog.subjects.some((item) => item.name === subject);
    if (!hasSubject) {
      setSubject(catalog.subjects[0].name);
    }
  }, [catalog, subject]);

  const chapterOptions = useMemo(() => {
    return catalog?.subjects.find((item) => item.name === subject)?.chapters || [];
  }, [catalog, subject]);

  useEffect(() => {
    if (!chapterOptions.length) {
      setChapter("");
      return;
    }

    if (!chapterOptions.some((item) => item.chapter === chapter)) {
      setChapter(chapterOptions[0].chapter);
    }
  }, [chapter, chapterOptions]);

  const handleSummarize = async () => {
    if (!subject || !chapter) return;
    setSummaryLoading(true);
    setError("");
    try {
      const result = await requestChapterSummary({
        language: languageLabel,
        grade,
        subject,
        chapter
      });
      setSummary({
        chapter: result.chapter || chapter,
        subject: result.subject || subject,
        grade: result.grade || grade,
        topicCount: Number(result.topicCount || 0),
        questionCount: Number(result.questionCount || 0),
        summary: result.summary || "",
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
        formulas: Array.isArray(result.formulas) ? result.formulas : [],
        studyTips: Array.isArray(result.studyTips) ? result.studyTips : [],
        practiceFocus: Array.isArray(result.practiceFocus) ? result.practiceFocus : []
      });
    } catch (requestError: any) {
      setSummary(null);
      setError(requestError.message || "Unable to summarize this chapter right now.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="tutor-panel">
      <div className="summary-header">
        <div>
          <h3>Chapter Summary AI</h3>
          <p>Choose a class, subject, and chapter to get a quick student-friendly summary.</p>
        </div>
        {summary ? (
          <div className="stat-row">
            <span className="stat-pill">Topics: {summary.topicCount}</span>
            <span className="stat-pill">Questions: {summary.questionCount}</span>
          </div>
        ) : null}
      </div>

      <div className="tutor-controls">
        <label>
          Class
          <select value={grade} onChange={(event) => setGrade(event.target.value)}>
            {gradeOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={catalogLoading || !catalog?.subjects.length}
          >
            {(catalog?.subjects || []).map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chapter
          <select
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            disabled={catalogLoading || !chapterOptions.length}
          >
            {chapterOptions.map((item) => (
              <option key={item.id} value={item.chapter}>
                {item.chapter}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="summary-actions">
        <button
          className="btn btn-primary"
          onClick={handleSummarize}
          disabled={catalogLoading || summaryLoading || !subject || !chapter}
        >
          {summaryLoading ? "Summarizing..." : "Summarize Chapter"}
        </button>
        {catalogLoading ? <p className="muted">Loading chapters...</p> : null}
        {error ? <p className="muted">{error}</p> : null}
      </div>

      {summary ? (
        <div className="summary-grid">
          <div className="quiz-card">
            <h4>
              {summary.chapter} - Class {summary.grade}
            </h4>
            <p>{summary.summary}</p>
          </div>
          <div className="card-grid">
            <div className="card">
              <h4>Key Points</h4>
              <ul>
                {summary.keyPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h4>Formulas</h4>
              <ul>
                {summary.formulas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h4>Study Tips</h4>
              <ul>
                {summary.studyTips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h4>Practice Focus</h4>
              <ul>
                {summary.practiceFocus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChapterSummaryPanel;
