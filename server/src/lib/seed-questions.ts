/**
 * The starter question bank. It is inserted once, the first time the app
 * connects to an empty database, so a fresh install has enough questions to
 * run a 10-question test straight away. Everything here lives in MongoDB
 * afterwards and can be edited from the admin panel.
 */
export type SeedQuestion = {
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  subject: string;
};

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ── JavaScript ────────────────────────────────────────────────
  {
    text: "What does `typeof null` return in JavaScript?",
    options: ['"null"', '"object"', '"undefined"', '"boolean"'],
    correctIndex: 1,
    subject: "JavaScript",
  },
  {
    text: "Which keyword declares a block-scoped variable that cannot be reassigned?",
    options: ["var", "let", "const", "static"],
    correctIndex: 2,
    subject: "JavaScript",
  },
  {
    text: "What is the result of `2 + '2'` in JavaScript?",
    options: ["4", "'22'", "NaN", "undefined"],
    correctIndex: 1,
    subject: "JavaScript",
  },
  {
    text: "Which method removes the last element of an array and returns it?",
    options: ["shift()", "slice()", "pop()", "splice()"],
    correctIndex: 2,
    subject: "JavaScript",
  },
  {
    text: "Which of these is NOT a JavaScript primitive type?",
    options: ["symbol", "bigint", "object", "boolean"],
    correctIndex: 2,
    subject: "JavaScript",
  },

  // ── React ─────────────────────────────────────────────────────
  {
    text: "Which hook stores state inside a function component?",
    options: ["useEffect", "useState", "useMemo", "useRef"],
    correctIndex: 1,
    subject: "React",
  },
  {
    text: "What is the correct way to pass data from a parent to a child component?",
    options: ["props", "state", "context only", "refs"],
    correctIndex: 0,
    subject: "React",
  },
  {
    text: "What does the dependency array of `useEffect` control?",
    options: [
      "How often the component renders",
      "When the effect runs again",
      "The order of hooks",
      "The component's CSS",
    ],
    correctIndex: 1,
    subject: "React",
  },
  {
    text: "Why does React require a stable `key` prop when rendering a list?",
    options: [
      "To style each item",
      "To help React identify which items changed",
      "To sort the list automatically",
      "Keys are optional and unused",
    ],
    correctIndex: 1,
    subject: "React",
  },
  {
    text: "Which tool is commonly used with React to render on the server?",
    options: ["Webpack", "Next.js", "Jest", "Babel"],
    correctIndex: 1,
    subject: "React",
  },

  // ── Node.js & Express ─────────────────────────────────────────
  {
    text: "Which module system does modern Node.js use by default in `.mjs` files?",
    options: ["CommonJS", "AMD", "ECMAScript modules", "UMD"],
    correctIndex: 2,
    subject: "Node.js",
  },
  {
    text: "In Express, which middleware parses a JSON request body?",
    options: ["express.json()", "express.urlencoded()", "cookieParser()", "express.static()"],
    correctIndex: 0,
    subject: "Node.js",
  },
  {
    text: "What does `process.env` give you in a Node.js app?",
    options: ["The command-line arguments", "Environment variables", "The running processes", "The folder structure"],
    correctIndex: 1,
    subject: "Node.js",
  },
  {
    text: "Which HTTP status code means the user is not authenticated?",
    options: ["403", "401", "404", "500"],
    correctIndex: 1,
    subject: "Node.js",
  },
  {
    text: "What is the purpose of a JWT?",
    options: [
      "To compress responses",
      "To carry signed claims between client and server",
      "To encrypt the database",
      "To cache pages",
    ],
    correctIndex: 1,
    subject: "Node.js",
  },

  // ── MongoDB ───────────────────────────────────────────────────
  {
    text: "Which MongoDB method returns all documents matching a filter?",
    options: ["find()", "insertOne()", "drop()", "countDocuments()"],
    correctIndex: 0,
    subject: "MongoDB",
  },
  {
    text: "In Mongoose, what does a Schema define?",
    options: ["A database connection", "The shape and rules of a document", "A collection index only", "A server route"],
    correctIndex: 1,
    subject: "MongoDB",
  },
  {
    text: "Which MongoDB collection index type guarantees unique values?",
    options: ["compound", "text", "unique", "sparse text"],
    correctIndex: 2,
    subject: "MongoDB",
  },
  {
    text: "What does `populate()` do in Mongoose?",
    options: [
      "Empties a collection",
      "Replaces stored ids with the referenced documents",
      "Creates an index",
      "Duplicates a document",
    ],
    correctIndex: 1,
    subject: "MongoDB",
  },
  {
    text: "Which operator selects documents where a field is greater than a value?",
    options: ["$eq", "$gt", "$in", "$set"],
    correctIndex: 1,
    subject: "MongoDB",
  },

  // ── Web Fundamentals ──────────────────────────────────────────
  {
    text: "Which HTTP method is used to update a whole existing resource?",
    options: ["GET", "POST", "PUT", "HEAD"],
    correctIndex: 2,
    subject: "Web Fundamentals",
  },
  {
    text: "What does CSS stand for?",
    options: ["Cascading Style Sheets", "Computer Styled Sections", "Creative Style System", "Cascading Simple Syntax"],
    correctIndex: 0,
    subject: "Web Fundamentals",
  },
  {
    text: "Which storage keeps data on the client after the browser is closed?",
    options: ["sessionStorage", "localStorage", "a JavaScript variable", "the DOM"],
    correctIndex: 1,
    subject: "Web Fundamentals",
  },
  {
    text: "What is the main purpose of hashing a password before storing it?",
    options: [
      "To make it shorter",
      "So the original password cannot be read from the database",
      "To speed up login",
      "To sync the password between devices",
    ],
    correctIndex: 1,
    subject: "Web Fundamentals",
  },
  {
    text: "Which header tells the browser the response is JSON?",
    options: ["Accept", "Content-Type: application/json", "Host", "Referer"],
    correctIndex: 1,
    subject: "Web Fundamentals",
  },

  // ── Aptitude ──────────────────────────────────────────────────
  {
    text: "If a test has 10 questions and a student answers 7 correctly, what is the percentage?",
    options: ["60%", "70%", "75%", "80%"],
    correctIndex: 1,
    subject: "Aptitude",
  },
  {
    text: "A train travels 120 km in 2 hours. What is its average speed?",
    options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
    correctIndex: 1,
    subject: "Aptitude",
  },
  {
    text: "What is 15% of 200?",
    options: ["25", "30", "35", "20"],
    correctIndex: 1,
    subject: "Aptitude",
  },
  {
    text: "Complete the series: 2, 4, 8, 16, ?",
    options: ["18", "24", "32", "20"],
    correctIndex: 2,
    subject: "Aptitude",
  },
  {
    text: "If 5 workers finish a job in 12 days, how long will 10 workers take at the same rate?",
    options: ["3 days", "6 days", "12 days", "24 days"],
    correctIndex: 1,
    subject: "Aptitude",
  },
];
