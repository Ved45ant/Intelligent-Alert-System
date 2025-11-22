import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: "admin" | "operator";
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "operator" },
});

export const UserModel = model<IUser>("User", UserSchema);
