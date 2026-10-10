import { model, Schema, type HydratedDocument } from "mongoose";
import type { UserFields } from "../types/domain.js";

const userSchema = new Schema<UserFields>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<UserFields>;
export const User = model<UserFields>("User", userSchema);
