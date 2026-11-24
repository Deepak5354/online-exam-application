/**
 * Fill the question bank with the starter questions.
 *
 *   npm run seed
 *
 * It only adds questions when the bank is empty, so running it twice does not
 * create duplicates. The app also does this on first start; the script is for
 * re-seeding a database you cleared by hand.
 */
import { connectDb, disconnectDb, seedQuestions } from "../src/db.js";
import { Question } from "../src/models/question.js";

async function main() {
  await connectDb();
  const before = await Question.estimatedDocumentCount();
  if (before > 0) {
    console.info(`The bank already has ${before} questions; nothing was added.`);
  } else {
    await seedQuestions();
    console.info(`Added ${await Question.estimatedDocumentCount()} starter questions.`);
  }
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
