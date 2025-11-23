import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: "admin" | "operator";
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, default: "operator" },
});

export const UserModel = model<IUser>("User", UserSchema);
