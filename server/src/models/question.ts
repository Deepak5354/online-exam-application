import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One multiple-choice question in the question bank.
 *
 * `correctIndex` is the position (0-3) of the right option inside `options`.
 * It is stored in MongoDB but never sent to a student's browser: the test API
 * only returns the question text and the options.
 */
const questionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options: string[]) => options.length === 4,
        message: "A question needs exactly four options.",
      },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    subject: { type: String, required: true, trim: true, maxlength: 60, index: true },
    /** Set when the question was written by an admin (null for seeded questions). */
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

questionSchema.index({ subject: 1, createdAt: -1 });

export type QuestionDoc = InferSchemaType<typeof questionSchema>;
export const Question = model("Question", questionSchema);
