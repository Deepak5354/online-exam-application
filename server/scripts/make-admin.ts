/**
 * Promote (or demote) an existing account.
 *
 *   npm run make-admin -- person@example.com          # make an admin
 *   npm run make-admin -- person@example.com student  # back to a student
 *
 * Needs MONGODB_URI to point at the same database the app uses.
 */
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/db.js";
import { User } from "../src/models/user.js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = (process.argv[3] ?? "admin").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- <email> [admin|student]");
    process.exit(1);
  }
  if (role !== "admin" && role !== "student") {
    console.error('The role must be "admin" or "student".');
    process.exit(1);
  }
  await connectDb();
  const user = await User.findOneAndUpdate({ email }, { $set: { role } }, { returnDocument: "after" }).lean();
  if (!user) {
    console.error(`No account with the email ${email}. Register it in the app first.`);
  } else {
    console.info(`${user.email} is now a ${user.role}.`);
  }
  await disconnectDb();
  await mongoose.connection.close().catch(() => {});
  process.exit(user ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
