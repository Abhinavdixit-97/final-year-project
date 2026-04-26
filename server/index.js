const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs/promises");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const { dbPromise, initDb } = require("./db");
const { getChapterContent, getContentCatalog } = require("./content");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5050;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const DEFAULT_TEACHER_EMAIL =
  process.env.DEFAULT_TEACHER_EMAIL || "teacher@demo.local";
const DEFAULT_TEACHER_PASSWORD =
  process.env.DEFAULT_TEACHER_PASSWORD || "Teach@123";
const ROOT_DIR = path.join(__dirname, "..");
const IS_PROD = process.env.NODE_ENV === "production";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

const safeJsonParse = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return null;
  }
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    return null;
  }
};

const buildSystemPrompt = (language, grade, subject, chapter) => {
  const chapterLine = chapter
    ? `The current chapter is "${chapter}". All explanations, examples, and quiz questions must be strictly based on this chapter only.`
    : "";
  return [
    "You are a friendly AI tutor and mentor for school students in grades 6 to 12.",
    "Your role is to help students understand concepts clearly before they practice.",
    "Always follow this learning flow: Understand First → Then Practice → Then Master.",
    `Use ${language} as the response language.`,
    `The student is in Class ${grade}, studying ${subject}.`,
    chapterLine,
    "CONTEXT RULES:",
    `- Only respond to topics relevant to Class ${grade} ${subject}${chapter ? ` Chapter: ${chapter}` : ""}.`,
    "- If the student asks about unrelated topics or other classes, politely redirect them back.",
    "CHAPTER EXPLANATION RULES (when explaining a concept):",
    "- Use simple, student-friendly language. Avoid complex jargon.",
    "- Break down concepts step by step.",
    "- Include real-life examples the student can relate to.",
    "- Structure your explanation as: 1) Introduction 2) Core concept 3) Example 4) Key points summary.",
    "QUIZ RULES:",
    "- Only offer a quiz after explaining the concept.",
    "- Ask the student if they are ready before starting the quiz.",
    "- If the student is confused, re-explain in a simpler way before quizzing.",
    "BEHAVIOR:",
    "- Be warm, encouraging, and motivating like a good teacher.",
    "- Keep answers concise but clear.",
    "- Adapt your explanation based on how well the student seems to understand.",
    "- Never provide incorrect or unrelated information.",
    "When asked for JSON output, return ONLY valid JSON with no extra text."
  ].filter(Boolean).join(" ");
};

const callOpenAI = async (messages, model = "gpt-3.5-turbo") => {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  try {
    console.log("Calling OpenAI with model:", model);
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.4,
    });
    console.log("OpenAI response received");
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI API Error:", error.message);
    throw error;
  }
};

const callGemini = async (prompt, model = "gemini-1.5-flash") => {
  if (!genAI) {
    throw new Error("Google API key not configured");
  }
  try {
    const geminiModel = genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
};

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: String(item.content || "")
  }));
};

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const buildChapterDigest = (chapterContent) => {
  const lines = [
    `Grade: ${chapterContent.grade}`,
    `Board: ${chapterContent.board || "CBSE"}`,
    `Subject: ${chapterContent.subject}`,
    `Chapter: ${chapterContent.chapter}`,
    `Official reference: ${chapterContent.officialReference || ""}`,
    `Overview: ${chapterContent.overview || ""}`
  ];

  chapterContent.learningGoals.forEach((goal, index) => {
    lines.push(`Learning goal ${index + 1}: ${goal}`);
  });

  chapterContent.focusAreas.forEach((item, index) => {
    lines.push(`Focus area ${index + 1}: ${item}`);
  });

  chapterContent.readingPassages.forEach((item, index) => {
    lines.push(`Reading paragraph ${index + 1}: ${item}`);
  });

  chapterContent.readingBlocks.forEach((block, index) => {
    lines.push(`Reading block ${index + 1}: ${block.title} - ${block.text}`);
  });

  return lines.join("\n");
};

const fallbackChapterSummary = (chapterContent) => {
  const keyPoints = chapterContent.focusAreas.slice(0, 4);
  const studyTips = [
    "Read one topic at a time and explain it in your own words.",
    "Turn the learning goals into short recall notes before the quiz.",
    "Review incorrect answers and note the pattern of mistakes."
  ];
  const practiceFocus = chapterContent.learningGoals.slice(0, 4);

  return {
    chapter: chapterContent.chapter,
    subject: chapterContent.subject,
    grade: chapterContent.grade,
    topicCount: chapterContent.focusAreas.length,
    questionCount: 5,
    summary: chapterContent.readingPassages[0] || chapterContent.overview,
    keyPoints,
    studyTips,
    practiceFocus
  };
};

const buildFallbackChapterQuiz = (chapterContent) => {
  const focus = chapterContent.focusAreas.length
    ? chapterContent.focusAreas
    : chapterContent.learningGoals;
  const correctFocus = focus[0] || `Core ideas from ${chapterContent.chapter}`;
  const alternateFocus = focus[1] || "Worked examples and revision";
  const subjectDistractors = [
    "History",
    "Geography",
    "Science",
    "Mathematics",
    "Economics",
    "Political Science"
  ].filter((item) => item !== chapterContent.subject);

  return {
    chapter: chapterContent.chapter,
    subject: chapterContent.subject,
    grade: chapterContent.grade,
    questions: [
      {
        id: `${chapterContent.chapterId || "chapter"}-q1`,
        question: `Which subject does the chapter "${chapterContent.chapter}" belong to?`,
        options: [chapterContent.subject, ...subjectDistractors.slice(0, 3)],
        correctAnswer: chapterContent.subject,
        explanation: `${chapterContent.chapter} is part of ${chapterContent.subject} for Class ${chapterContent.grade}.`
      },
      {
        id: `${chapterContent.chapterId || "chapter"}-q2`,
        question: `Which of the following is a focus area for "${chapterContent.chapter}"?`,
        options: [
          correctFocus,
          "Unrelated memorisation only",
          "Ignoring examples completely",
          "Skipping the chapter notes"
        ],
        correctAnswer: correctFocus,
        explanation: `The learning path highlights "${correctFocus}" as one of the main focus areas.`
      },
      {
        id: `${chapterContent.chapterId || "chapter"}-q3`,
        question: `What should a student do before attempting the quiz on "${chapterContent.chapter}"?`,
        options: [
          chapterContent.readingBlocks[2]?.text || "Revise key notes and examples.",
          "Start guessing without reading",
          "Skip the chapter and open the next one",
          "Memorise only unrelated facts"
        ],
        correctAnswer: chapterContent.readingBlocks[2]?.text || "Revise key notes and examples.",
        explanation: "The learning path expects the student to read first and revise before the quiz."
      },
      {
        id: `${chapterContent.chapterId || "chapter"}-q4`,
        question: `Which statement best matches the learning goal of "${chapterContent.chapter}"?`,
        options: [
          chapterContent.learningGoals[0] || `Understand the main ideas from ${chapterContent.chapter}.`,
          "Avoid examples and solved work",
          "Study a different subject instead",
          "Ignore the chapter summary"
        ],
        correctAnswer:
          chapterContent.learningGoals[0] || `Understand the main ideas from ${chapterContent.chapter}.`,
        explanation: "The first learning goal captures the main target of the chapter."
      },
      {
        id: `${chapterContent.chapterId || "chapter"}-q5`,
        question: `Why is reading the chapter first useful in this learning path?`,
        options: [
          `It helps build clarity before answering quiz questions on ${alternateFocus}.`,
          "It removes the need to think during the quiz",
          "It makes all questions identical",
          "It means the student can skip revision forever"
        ],
        correctAnswer: `It helps build clarity before answering quiz questions on ${alternateFocus}.`,
        explanation: "The app is designed so chapter reading builds understanding before the quiz starts."
      }
    ]
  };
};

const buildGeneralSystemPrompt = (language) => {
  return [
    "You are a helpful all-purpose AI assistant inside a learning platform.",
    "Answer general questions clearly, directly, and in a friendly tone.",
    "You can help with study topics, technology, coding, project ideas, and everyday knowledge.",
    "If a request is unsafe or harmful, refuse briefly and redirect safely.",
    `Use ${language || "English"} as the response language.`
  ].join(" ");
};

const seedQuestionsBySubject = {
  Math: [
    {
      prompt: "What is 12 + 8?",
      options: ["18", "20", "22", "24"],
      correctIndex: 1
    },
    {
      prompt: "Solve: 5x = 35. What is x?",
      options: ["5", "6", "7", "8"],
      correctIndex: 2
    },
    {
      prompt: "Which fraction is equal to 0.5?",
      options: ["1/4", "1/2", "3/4", "2/3"],
      correctIndex: 1
    }
  ],
  Science: [
    {
      prompt: "Which organ pumps blood through the body?",
      options: ["Lungs", "Brain", "Heart", "Kidney"],
      correctIndex: 2
    },
    {
      prompt: "Plants make food by a process called:",
      options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"],
      correctIndex: 1
    },
    {
      prompt: "What force keeps us on the ground?",
      options: ["Friction", "Gravity", "Magnetism", "Pressure"],
      correctIndex: 1
    }
  ],
  English: [
    {
      prompt: "Choose the correct sentence.",
      options: [
        "He go to school.",
        "He goes to school.",
        "He going to school.",
        "He gone to school."
      ],
      correctIndex: 1
    },
    {
      prompt: "Select the noun in the sentence: 'The cat sleeps.'",
      options: ["The", "cat", "sleeps", "fast"],
      correctIndex: 1
    },
    {
      prompt: "Pick the synonym of 'quick'.",
      options: ["slow", "fast", "late", "sad"],
      correctIndex: 1
    }
  ],
  "General Knowledge": [
    {
      prompt: "What is the capital of India?",
      options: ["Mumbai", "Delhi", "Chennai", "Kolkata"],
      correctIndex: 1
    },
    {
      prompt: "How many continents are there?",
      options: ["5", "6", "7", "8"],
      correctIndex: 2
    },
    {
      prompt: "Which is the largest ocean?",
      options: ["Atlantic", "Indian", "Pacific", "Arctic"],
      correctIndex: 2
    }
  ],
  "Moral Science": [
    {
      prompt: "Which action shows kindness?",
      options: ["Sharing", "Cheating", "Shouting", "Ignoring"],
      correctIndex: 0
    },
    {
      prompt: "What should you do if you make a mistake?",
      options: ["Hide it", "Admit it", "Blame others", "Lie"],
      correctIndex: 1
    },
    {
      prompt: "Being fair means:",
      options: [
        "Only helping friends",
        "Treating everyone equally",
        "Always winning",
        "Never sharing"
      ],
      correctIndex: 1
    }
  ]
};

const ensureSeedChapters = async () => {
  const db = await dbPromise;
  const existing = await db.get("SELECT id FROM chapters LIMIT 1");
  if (existing) return;

  const teacher = await db.get("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
  if (!teacher) return;

  const grades = ["6", "7", "8", "9", "10", "11", "12"];
  const subjects = Object.keys(seedQuestionsBySubject);

  for (const grade of grades) {
    for (const subject of subjects) {
      const title = `${subject} Basics - Grade ${grade}`;
      const summary = `Core concepts and practice questions for Grade ${grade} ${subject}.`;
      const result = await db.run(
        `INSERT INTO chapters (teacher_id, grade, subject, title, summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [teacher.id, grade, subject, title, summary, Date.now()]
      );
      const chapterId = result.lastID;
      const questions = seedQuestionsBySubject[subject] || [];
      for (const question of questions) {
        await db.run(
          `INSERT INTO questions (chapter_id, prompt, options, correct_index)
           VALUES (?, ?, ?, ?)`,
          [
            chapterId,
            question.prompt,
            JSON.stringify(question.options),
            question.correctIndex
          ]
        );
      }
    }
  }
};

const createToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const requireAuth = (role) => async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await dbPromise;
    const user = await db.get(
      "SELECT id, role, name, email, username, grade FROM users WHERE id = ?",
      payload.userId
    );
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ error: "Access denied." });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

const ensureDefaultTeacher = async () => {
  const db = await dbPromise;
  const existing = await db.get(
    "SELECT id FROM users WHERE role = 'teacher' AND email = ?",
    DEFAULT_TEACHER_EMAIL
  );
  if (existing) return;
  const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, 10);
  await db.run(
    `INSERT INTO users (role, name, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["teacher", "Demo Teacher", DEFAULT_TEACHER_EMAIL, passwordHash, Date.now()]
  );
};

app.get("/api/health", async (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login/teacher", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required." });
    }
    const db = await dbPromise;
    const user = await db.get(
      "SELECT * FROM users WHERE role = 'teacher' AND email = ?",
      email
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const token = createToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/auth/login/student", async (req, res) => {
  try {
    const { username, pin } = req.body || {};
    if (!username || !pin) {
      return res.status(400).json({ error: "Username and PIN required." });
    }
    const db = await dbPromise;
    const user = await db.get(
      "SELECT * FROM users WHERE role = 'student' AND username = ?",
      username
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const valid = await bcrypt.compare(pin, user.pin_hash || "");
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const token = createToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        username: user.username,
        grade: user.grade
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed." });
  }
});

app.get("/api/auth/me", requireAuth(), async (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/teacher/students", requireAuth("teacher"), async (_req, res) => {
  const db = await dbPromise;
  const students = await db.all(
    "SELECT id, name, username, grade FROM users WHERE role = 'student' ORDER BY created_at DESC"
  );
  res.json({ students });
});

app.post("/api/teacher/students", requireAuth("teacher"), async (req, res) => {
  try {
    const { name, username, grade, pin } = req.body || {};
    if (!name || !username || !grade || !pin) {
      return res.status(400).json({ error: "Missing student fields." });
    }
    const db = await dbPromise;
    const existing = await db.get(
      "SELECT id FROM users WHERE username = ?",
      username
    );
    if (existing) {
      return res.status(400).json({ error: "Username already exists." });
    }
    const pinHash = await bcrypt.hash(pin, 10);
    const result = await db.run(
      `INSERT INTO users (role, name, username, grade, pin_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["student", name, username, grade, pinHash, Date.now()]
    );
    const studentId = result.lastID;
    const chapters = await db.all(
      "SELECT id FROM chapters WHERE grade = ?",
      grade
    );
    for (const chapter of chapters) {
      await db.run(
        "INSERT INTO assignments (chapter_id, student_id, assigned_at) VALUES (?, ?, ?)",
        [chapter.id, studentId, Date.now()]
      );
    }
    return res.json({
      student: { id: studentId, name, username, grade }
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add student." });
  }
});

app.get("/api/teacher/chapters", requireAuth("teacher"), async (req, res) => {
  const db = await dbPromise;
  const chapters = await db.all(
    "SELECT id, grade, subject, title, summary FROM chapters WHERE teacher_id = ? ORDER BY created_at DESC",
    req.user.id
  );
  res.json({ chapters });
});

app.post("/api/teacher/chapters", requireAuth("teacher"), async (req, res) => {
  try {
    const { grade, subject, title, summary, questions } = req.body || {};
    if (!grade || !subject || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Invalid chapter payload." });
    }
    const db = await dbPromise;
    const result = await db.run(
      `INSERT INTO chapters (teacher_id, grade, subject, title, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, grade, subject, title, summary || "", Date.now()]
    );
    const chapterId = result.lastID;
    for (const question of questions) {
      const options = Array.isArray(question.options) ? question.options : [];
      await db.run(
        `INSERT INTO questions (chapter_id, prompt, options, correct_index)
         VALUES (?, ?, ?, ?)`,
        [
          chapterId,
          question.prompt,
          JSON.stringify(options),
          Number(question.correctIndex || 0)
        ]
      );
    }
    res.json({ chapterId });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save chapter." });
  }
});

app.get("/api/teacher/assignments", requireAuth("teacher"), async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all(
    `
    SELECT
      assignments.id AS id,
      assignments.assigned_at AS assignedAt,
      students.id AS studentId,
      students.name AS studentName,
      students.grade AS studentGrade,
      chapters.id AS chapterId,
      chapters.title AS chapterTitle,
      chapters.grade AS chapterGrade,
      chapters.subject AS chapterSubject
    FROM assignments
    JOIN users AS students ON assignments.student_id = students.id
    JOIN chapters ON assignments.chapter_id = chapters.id
    WHERE chapters.teacher_id = ?
    ORDER BY assignments.assigned_at DESC
    `,
    req.user.id
  );
  res.json({ assignments: rows });
});

app.post("/api/teacher/assignments", requireAuth("teacher"), async (req, res) => {
  try {
    const { studentId, chapterId } = req.body || {};
    if (!studentId || !chapterId) {
      return res.status(400).json({ error: "Student and chapter required." });
    }
    const db = await dbPromise;
    const chapter = await db.get(
      "SELECT id FROM chapters WHERE id = ? AND teacher_id = ?",
      [chapterId, req.user.id]
    );
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found." });
    }
    const student = await db.get(
      "SELECT id FROM users WHERE id = ? AND role = 'student'",
      studentId
    );
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }
    const result = await db.run(
      "INSERT INTO assignments (chapter_id, student_id, assigned_at) VALUES (?, ?, ?)",
      [chapterId, studentId, Date.now()]
    );
    res.json({ assignmentId: result.lastID });
  } catch (error) {
    return res.status(500).json({ error: "Failed to assign chapter." });
  }
});

app.get("/api/teacher/attempts", requireAuth("teacher"), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ error: "studentId required." });
  }
  const db = await dbPromise;
  const attempts = await db.all(
    `
    SELECT attempts.*
    FROM attempts
    LEFT JOIN chapters ON attempts.chapter_id = chapters.id
    WHERE attempts.student_id = ?
      AND (chapters.teacher_id = ? OR attempts.chapter_id IS NULL)
    ORDER BY attempts.timestamp DESC
    `,
    [studentId, req.user.id]
  );
  res.json({ attempts });
});

app.get("/api/student/assignments", requireAuth("student"), async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all(
    `
    SELECT assignments.id AS assignmentId,
           assignments.assigned_at AS assignedAt,
           chapters.id AS chapterId,
           chapters.grade AS grade,
           chapters.subject AS subject,
           chapters.title AS title,
           chapters.summary AS summary
    FROM assignments
    JOIN chapters ON assignments.chapter_id = chapters.id
    WHERE assignments.student_id = ?
    ORDER BY assignments.assigned_at DESC
    `,
    req.user.id
  );

  const assignments = [];
  for (const row of rows) {
    const questions = await db.all(
      "SELECT id, prompt, options, correct_index FROM questions WHERE chapter_id = ?",
      row.chapterId
    );
    assignments.push({
      assignmentId: row.assignmentId,
      assignedAt: row.assignedAt,
      chapter: {
        id: row.chapterId,
        grade: row.grade,
        subject: row.subject,
        title: row.title,
        summary: row.summary,
        questions: questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          options: JSON.parse(question.options || "[]"),
          correctIndex: question.correct_index
        }))
      }
    });
  }

  res.json({ assignments });
});

app.get("/api/student/attempts", requireAuth("student"), async (req, res) => {
  const db = await dbPromise;
  const attempts = await db.all(
    "SELECT * FROM attempts WHERE student_id = ? ORDER BY timestamp DESC",
    req.user.id
  );
  res.json({ attempts });
});

app.post("/api/student/attempts", requireAuth("student"), async (req, res) => {
  try {
    const {
      chapterId,
      subject,
      correct,
      points,
      timeSpentSec,
      difficulty,
      question,
      source
    } = req.body || {};
    const db = await dbPromise;
    const result = await db.run(
      `
      INSERT INTO attempts
        (student_id, chapter_id, subject, correct, points, time_spent_sec, difficulty, question, source, timestamp)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        chapterId || null,
        subject || "",
        correct ? 1 : 0,
        Number(points || 0),
        Number(timeSpentSec || 0),
        difficulty || "",
        question || "",
        source || "chapter",
        Date.now()
      ]
    );
    res.json({ attemptId: result.lastID });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save attempt." });
  }
});

app.get("/api/content/catalog", async (req, res) => {
  try {
    const { grade } = req.query || {};
    const catalog = await getContentCatalog(grade);
    res.json(catalog);
  } catch (error) {
    const status =
      error.code === "BAD_REQUEST" ? 400 : error.code === "NOT_FOUND" ? 404 : 500;
    res.status(status).json({ error: error.message || "Failed to load content catalog." });
  }
});

app.get("/api/content/chapter", async (req, res) => {
  try {
    const { grade, subject, chapter } = req.query || {};
    const chapterContent = await getChapterContent(grade, subject, chapter);
    res.json(chapterContent);
  } catch (error) {
    const status =
      error.code === "BAD_REQUEST" ? 400 : error.code === "NOT_FOUND" ? 404 : 500;
    res.status(status).json({ error: error.message || "Failed to load chapter content." });
  }
});

app.post("/api/ai/chapter-summary", async (req, res) => {
  try {
    const { language, grade, subject, chapter } = req.body || {};
    const chapterContent = await getChapterContent(grade, subject, chapter);
    try {
      const system = buildSystemPrompt(
        language || "English",
        chapterContent.grade,
        chapterContent.subject,
        chapterContent.chapter
      );
      const userPrompt = [
        "Explain this chapter to the student following the learning structure:",
        "1) Introduction of the topic 2) Core concept explanation 3) Real-life example 4) Key points summary.",
        "Then summarize for study use.",
        "Include key formulas if any (e.g., math or science formulas).",
        "Return JSON with keys: summary (string), keyPoints (array), formulas (array), studyTips (array), practiceFocus (array).",
        "Keep the explanation simple, student-friendly, and chapter-specific.",
        "Chapter content:",
        buildChapterDigest(chapterContent)
      ].join("\n");

      let content;
      if (genAI) {
        const fullPrompt = [
          system,
          "",
          userPrompt
        ].join("\n");
        content = await callGemini(fullPrompt);
      } else if (openai) {
        content = await callOpenAI([
          { role: "system", content: system },
          { role: "user", content: userPrompt }
        ]);
      } else {
        throw new Error("No AI API configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY.");
      }

      const parsed = safeJsonParse(content);
      if (parsed && parsed.summary) {
        return res.json({
          chapter: chapterContent.chapter,
          subject: chapterContent.subject,
          grade: chapterContent.grade,
          topicCount: chapterContent.focusAreas.length,
          questionCount: 5,
          summary: String(parsed.summary || "").trim(),
          keyPoints: normalizeTextList(parsed.keyPoints || parsed.key_points),
          formulas: normalizeTextList(parsed.formulas || []),
          studyTips: normalizeTextList(parsed.studyTips || parsed.study_tips),
          practiceFocus: normalizeTextList(parsed.practiceFocus || parsed.practice_focus)
        });
      }
    } catch (error) {
    console.error("Chapter Summary Error:", error.message);
    }

    return res.json(fallbackChapterSummary(chapterContent));
  } catch (error) {
    const status =
      error.code === "BAD_REQUEST" ? 400 : error.code === "NOT_FOUND" ? 404 : 200;
    if (status !== 200) {
      return res.status(status).json({ error: error.message || "Failed to summarize chapter." });
    }
    return res.json({
      summary: "The chapter summary assistant is temporarily unavailable.",
      keyPoints: [],
      formulas: [],
      studyTips: [],
      practiceFocus: []
    });
  }
});

app.post("/api/ai/chapter-quiz", async (req, res) => {
  try {
    const { language, grade, subject, chapter, history } = req.body || {};
    const chapterContent = await getChapterContent(grade, subject, chapter);
    try {
      const system = buildSystemPrompt(
        language || "English",
        chapterContent.grade,
        chapterContent.subject,
        chapterContent.chapter
      );
      const userPrompt = [,
        "Return JSON with a key named questions.",
        "Each question item must include: question (string), options (array of 4 strings), correctAnswer (string), explanation (string).",
        "Keep the questions suitable for the student's grade and directly tied to the chapter.",
        `Previous quiz questions to avoid repeating: ${JSON.stringify(history || [])}`,
        "Chapter content:",
        buildChapterDigest(chapterContent)
      ].join("\n");

      const content = await callOllama([
        { role: "system", content: system },
        { role: "user", content: userPrompt }
      ]);

      const parsed = safeJsonParse(content);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length) {
        const questions = parsed.questions
          .map((item, index) => {
            const options = Array.isArray(item.options)
              ? item.options.slice(0, 4).map((option) => String(option || "").trim())
              : [];
            const correctAnswer = String(item.correctAnswer || item.correct_answer || "").trim();
            if (!item.question || options.length < 4) {
              return null;
            }
            const fixedCorrectAnswer = options.includes(correctAnswer) ? correctAnswer : options[0];
            return {
              id: `${chapterContent.chapterId || "chapter"}-ai-${index + 1}`,
              question: String(item.question || "").trim(),
              options,
              correctAnswer: fixedCorrectAnswer,
              explanation: String(item.explanation || "").trim()
            };
          })
          .filter(Boolean);

        if (questions.length) {
          return res.json({
            chapter: chapterContent.chapter,
            subject: chapterContent.subject,
            grade: chapterContent.grade,
            questions
          });
        }
      }
    } catch (error) {
      return res.json(buildFallbackChapterQuiz(chapterContent));
    }

    return res.json(buildFallbackChapterQuiz(chapterContent));
  } catch (error) {
    const status =
      error.code === "BAD_REQUEST" ? 400 : error.code === "NOT_FOUND" ? 404 : 200;
    if (status !== 200) {
      return res.status(status).json({ error: error.message || "Failed to build chapter quiz." });
    }
    return res.json({
      questions: []
    });
  }
});

app.post("/api/ai/general", async (req, res) => {
  try {
    const { language, question, history } = req.body || {};
    if (!String(question || "").trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const system = buildGeneralSystemPrompt(language);
    const chatHistory = normalizeHistory(history);

    let content;
    if (genAI) {
      const historyText = chatHistory.map(h => `${h.role}: ${h.content}`).join("\n");
      const fullPrompt = [
        system,
        "",
        historyText,
        "",
        `user: ${String(question || "").trim()}`
      ].join("\n");
      content = await callGemini(fullPrompt);
    } else if (openai) {
      content = await callOpenAI([
        { role: "system", content: system },
        ...chatHistory,
        { role: "user", content: String(question || "").trim() }
      ]);
    } else {
      throw new Error("No AI API configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY.");
    }

    return res.json({
      answer: String(content || "").trim() || "I could not generate an answer right now."
    });
  } catch (error) {
    console.error("General AI Error:", error.message);
    return res.json({
      answer:
        "The general AI assistant is not available right now. Please try again in a moment."
    });
  }
});

app.post("/api/ai/doubt", async (req, res) => {
  try {
    const { language, grade, subject, chapter, question, history } = req.body || {};

    const system = buildSystemPrompt(language, grade, subject, chapter || "");
    const chatHistory = normalizeHistory(history);

    const userPrompt = [
      "Solve the student's doubt in a clear, child-friendly way.",
      "Return JSON with keys: answer (string), tips (array), next_steps (array).",
      `Question: ${question}`
    ].join("\n");

    let content;
    if (genAI) {
      const historyText = chatHistory.map(h => `${h.role}: ${h.content}`).join("\n");
      const fullPrompt = [
        system,
        "",
        historyText,
        "",
        `user: ${userPrompt}`
      ].join("\n");
      content = await callGemini(fullPrompt);
    } else if (openai) {
      content = await callOpenAI([
        { role: "system", content: system },
        ...chatHistory,
        { role: "user", content: userPrompt }
      ]);
    } else {
      throw new Error("No AI API configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY.");
    }

    const parsed = safeJsonParse(content);
    if (parsed && parsed.answer) {
      return res.json(parsed);
    }

    return res.json({
      answer: content.trim(),
      tips: [],
      next_steps: []
    });
  } catch (error) {
    console.error("Doubt Solve Error:", error.message);
    return res.json({
      answer:
        "I'm still warming up. Try again in a moment, or ask your teacher for help.",
      tips: ["Break the problem into small steps.", "Try a simpler example first."],
      next_steps: ["Review the basic concept", "Ask a specific question"]
    });
  }
});

app.post("/api/ai/level", async (req, res) => {
  try {
    const { language, grade, subject, chapter, diagnosticAnswers } = req.body || {};
    const answers = Array.isArray(diagnosticAnswers) ? diagnosticAnswers : [];

    const total = answers.length || 1;
    const correct = answers.filter(
      (item) =>
        String(item.studentAnswer || "").trim().toLowerCase() ===
        String(item.correctAnswer || "").trim().toLowerCase()
    ).length;
    const scorePercent = Math.round((correct / total) * 100);

    const system = buildSystemPrompt(language, grade, subject, chapter || "");
    const userPrompt = [
      "Analyze diagnostic answers and estimate the learner level.",
      "Return JSON with keys: level (beginner|intermediate|advanced), strengths (array), gaps (array), recommendedDifficulty (string).",
      `Score percent: ${scorePercent}`,
      "Answers:",
      JSON.stringify(answers)
    ].join("\n");

    const content = await callOllama([
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ]);

    const parsed = safeJsonParse(content);
    if (parsed && parsed.level) {
      return res.json(parsed);
    }

    const fallbackLevel =
      scorePercent >= 75 ? "advanced" : scorePercent >= 45 ? "intermediate" : "beginner";

    return res.json({
      level: fallbackLevel,
      strengths: ["Basic concepts"],
      gaps: ["Needs more practice"],
      recommendedDifficulty: fallbackLevel
    });
  } catch (error) {
    return res.json({
      level: "beginner",
      strengths: ["Basic concepts"],
      gaps: ["Needs more practice"],
      recommendedDifficulty: "beginner"
    });
  }
});

const fallbackQuestion = (subject, level) => {
  const bank = {
    Math: {
      beginner: {
        question: "What is 7 + 5?",
        choices: ["10", "11", "12", "13"],
        correctAnswer: "12",
        explanation: "7 + 5 = 12."
      },
      intermediate: {
        question: "What is the value of 6 x 7?",
        choices: ["36", "42", "48", "52"],
        correctAnswer: "42",
        explanation: "6 multiplied by 7 equals 42."
      },
      advanced: {
        question: "Solve: 3x + 5 = 20. What is x?",
        choices: ["3", "4", "5", "6"],
        correctAnswer: "5",
        explanation: "3x = 15, so x = 5."
      }
    },
    Science: {
      beginner: {
        question: "Which organ helps us breathe?",
        choices: ["Heart", "Lungs", "Liver", "Kidneys"],
        correctAnswer: "Lungs",
        explanation: "The lungs help us breathe oxygen."
      },
      intermediate: {
        question: "What gas do plants release during photosynthesis?",
        choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
        correctAnswer: "Oxygen",
        explanation: "Plants release oxygen during photosynthesis."
      },
      advanced: {
        question: "Which part of the cell contains genetic material?",
        choices: ["Nucleus", "Ribosome", "Cytoplasm", "Membrane"],
        correctAnswer: "Nucleus",
        explanation: "The nucleus stores DNA."
      }
    },
    English: {
      beginner: {
        question: "Choose the correct plural of 'child'.",
        choices: ["Childs", "Children", "Childes", "Childrens"],
        correctAnswer: "Children",
        explanation: "'Children' is the correct plural form."
      },
      intermediate: {
        question: "Identify the adjective in: 'The bright sun warmed us.'",
        choices: ["sun", "bright", "warmed", "us"],
        correctAnswer: "bright",
        explanation: "An adjective describes a noun. 'Bright' describes 'sun'."
      },
      advanced: {
        question: "Which sentence is in passive voice?",
        choices: [
          "The teacher explained the lesson.",
          "The lesson was explained by the teacher.",
          "Students solved the problem.",
          "She writes stories."
        ],
        correctAnswer: "The lesson was explained by the teacher.",
        explanation: "Passive voice focuses on the action receiver."
      }
    },
    "General Knowledge": {
      beginner: {
        question: "What is the capital of India?",
        choices: ["Mumbai", "Delhi", "Chennai", "Kolkata"],
        correctAnswer: "Delhi",
        explanation: "New Delhi is the capital of India."
      },
      intermediate: {
        question: "Which planet is known as the Red Planet?",
        choices: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctAnswer: "Mars",
        explanation: "Mars is called the Red Planet."
      },
      advanced: {
        question: "Which river is called the Ganga in India?",
        choices: ["Yamuna", "Ganges", "Godavari", "Narmada"],
        correctAnswer: "Ganges",
        explanation: "Ganga is another name for the Ganges river."
      }
    },
    "Moral Science": {
      beginner: {
        question: "Which action shows honesty?",
        choices: ["Hiding a mistake", "Telling the truth", "Blaming others", "Cheating"],
        correctAnswer: "Telling the truth",
        explanation: "Honesty means telling the truth."
      },
      intermediate: {
        question: "What should you do if someone is left out?",
        choices: ["Ignore them", "Make fun of them", "Invite them to join", "Walk away"],
        correctAnswer: "Invite them to join",
        explanation: "Including others is kind and respectful."
      },
      advanced: {
        question: "Which value helps resolve conflicts peacefully?",
        choices: ["Anger", "Empathy", "Pride", "Jealousy"],
        correctAnswer: "Empathy",
        explanation: "Empathy helps us understand others and solve issues."
      }
    }
  };

  const subjectBank = bank[subject] || bank.Math;
  const levelKey = subjectBank[level] ? level : "beginner";
  return {
    ...subjectBank[levelKey],
    difficultyTag: levelKey
  };
};

app.post("/api/ai/next-question", async (req, res) => {
  try {
    const { language, grade, subject, chapter, level, history } = req.body || {};
    const system = buildSystemPrompt(language, grade, subject, chapter || "");
    const userPrompt = [
      "Create one multiple-choice question for the student.",
      "Return JSON with keys: question (string), choices (array of 4 strings), correctAnswer (string), explanation (string), difficultyTag (string).",
      `Level: ${level}`,
      "Make it clear, short, and age-appropriate.",
      "Ensure correctAnswer is one of the choices.",
      `Previous questions: ${JSON.stringify(history || [])}`
    ].join("\n");

    const content = await callOllama([
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ]);

    const parsed = safeJsonParse(content);
    if (
      parsed &&
      parsed.question &&
      Array.isArray(parsed.choices) &&
      parsed.choices.length >= 3
    ) {
      const normalized = {
        question: parsed.question,
        choices: parsed.choices.slice(0, 4),
        correctAnswer: parsed.correctAnswer || parsed.choices[0],
        explanation: parsed.explanation || "",
        difficultyTag: parsed.difficultyTag || level
      };

      if (!normalized.choices.includes(normalized.correctAnswer)) {
        normalized.correctAnswer = normalized.choices[0];
      }

      return res.json(normalized);
    }

    return res.json(fallbackQuestion(subject || "Math", level || "beginner"));
  } catch (error) {
    return res.json(fallbackQuestion(subject || "Math", level || "beginner"));
  }
});

const setupFrontend = async () => {
  if (IS_PROD) {
    const distPath = path.join(ROOT_DIR, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
    return;
  }

  const { createServer } = await import("vite");
  const vite = await createServer({
    root: ROOT_DIR,
    server: { middlewareMode: true, hmr: false },
    appType: "spa"
  });

  app.use(async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    if (req.method !== "GET") return next();
    const accept = req.headers.accept || "";
    if (!accept.includes("text/html")) return next();
    try {
      const template = await fs.readFile(path.join(ROOT_DIR, "index.html"), "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });

  app.use(vite.middlewares);
};

const startServer = async () => {
  await initDb();
  await ensureDefaultTeacher();
  await ensureSeedChapters();
  await setupFrontend();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
