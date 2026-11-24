import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    /** "student" for everyone who signs up; "admin" can manage the question bank. */
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },
    /** Sessions issued before this moment are rejected (set on password reset). */
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
