const path = require("path");
const fs = require("fs/promises");

const ROOT_DIR = path.join(__dirname, "..");
const cache = new Map();

const normalize = (value) => String(value || "").trim().toLowerCase();

const createError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const loadGradeContent = async (grade) => {
  const gradeKey = String(grade || "").trim();
  if (!gradeKey) {
    throw createError("Grade is required.", "BAD_REQUEST");
  }

  if (cache.has(gradeKey)) {
    return cache.get(gradeKey);
  }

  const filePath = path.join(ROOT_DIR, "content", `class${gradeKey}.json`);
  let parsed;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createError("Content file not found.", "NOT_FOUND");
    }
    throw createError("Invalid content file.", "INVALID_CONTENT");
  }

  if (!parsed || !Array.isArray(parsed.subjects)) {
    throw createError("Content file has invalid structure.", "INVALID_CONTENT");
  }

  cache.set(gradeKey, parsed);
  return parsed;
};

const getContentCatalog = async (grade) => {
  const content = await loadGradeContent(grade);
  return {
    grade: String(content.class || grade),
    board: content.board || "CBSE",
    subjects: content.subjects.map((subject) => ({
      name: subject.name,
      chapters: Array.isArray(subject.chapters)
        ? subject.chapters.map((chapter) => ({
            id: chapter.id,
            chapter: chapter.chapter
          }))
        : []
    }))
  };
};

const getChapterContent = async (grade, subjectName, chapterName) => {
  if (!subjectName || !chapterName) {
    throw createError("Subject and chapter are required.", "BAD_REQUEST");
  }

  const content = await loadGradeContent(grade);
  const subject = content.subjects.find(
    (item) => normalize(item.name) === normalize(subjectName)
  );

  if (!subject) {
    throw createError("Subject not found.", "NOT_FOUND");
  }

  const chapter = (subject.chapters || []).find(
    (item) => normalize(item.chapter) === normalize(chapterName)
  );

  if (!chapter) {
    throw createError("Chapter not found.", "NOT_FOUND");
  }

  return {
    grade: String(content.class || grade),
    board: content.board || "CBSE",
    subject: subject.name,
    chapterId: chapter.id,
    chapter: chapter.chapter,
    officialReference: chapter.officialReference || "",
    overview: chapter.overview || "",
    learningGoals: Array.isArray(chapter.learningGoals) ? chapter.learningGoals : [],
    focusAreas: Array.isArray(chapter.focusAreas) ? chapter.focusAreas : [],
    readingPassages: Array.isArray(chapter.readingPassages) ? chapter.readingPassages : [],
    readingBlocks: Array.isArray(chapter.readingBlocks) ? chapter.readingBlocks : [],
    sourceLinks: content.sourceLinks || {}
  };
};

module.exports = {
  getChapterContent,
  getContentCatalog
};
