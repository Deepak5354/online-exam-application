import "dotenv/config";

const env = process.env.NODE_ENV ?? "development";
const isProd = env === "production";
const isTest = env === "test";

function read(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function jwtSecret(): string {
  const configured = read("JWT_SECRET");
  if (configured) return configured;
  if (isProd) throw new Error("JWT_SECRET is not set. Add a long random string to the environment.");
  return "dev-only-secret-change-me";
}

export const config = {
  env,
  isProd,
  isTest,
  port: Number(read("PORT") ?? 4000),
  /** MongoDB connection string. Optional in development (an in-memory database is used instead). */
  mongoUri: read("MONGODB_URI"),
  jwtSecret: jwtSecret(),
  /** Public URL of the app, used for password reset links and the origin check. */
  appUrl: (read("APP_URL") ?? "http://localhost:3000").replace(/\/+$/, ""),
  resendApiKey: read("RESEND_API_KEY"),
  resetEmailFrom: read("RESET_EMAIL_FROM"),
  /** True when a real email provider is configured for password reset emails. */
  emailConfigured: Boolean(read("RESEND_API_KEY") && read("RESET_EMAIL_FROM")),
  /**
   * DEMO ONLY. When true, and no email provider is configured, "Forgot password"
   * returns the reset link in the response so a reviewer can try the flow without
   * an inbox. This lets anyone who knows an email reset that account, so never
   * turn it on for a site with real users.
   */
  demoResetLinks: read("DEMO_SHOW_RESET_LINK") === "true",
  /** Name of the session cookie (kept from Queue Desk so existing sessions survive). */
  cookieName: "qd_session",
  sessionDays: 7,
  // ── Online Test settings ──────────────────────────────────────────────
  /** Questions per test. The test screen always shows exactly this many. */
  questionsPerTest: Number(read("QUESTIONS_PER_TEST") ?? 10),
  /** Countdown for one test, in seconds (10 minutes by default). */
  testDurationSeconds: Number(read("TEST_DURATION_SECONDS") ?? 600),
  /** Percentage needed to pass (40% by default). */
  passPercent: Number(read("TEST_PASS_PERCENT") ?? 40),
  /**
   * Emails that become admins when they register. Comma-separated, e.g.
   * ADMIN_EMAILS=admin@example.com,teacher@example.com
   * Existing users can be promoted with `npm run make-admin -- <email>`.
   */
  adminEmails: new Set(
    (read("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ),
};
