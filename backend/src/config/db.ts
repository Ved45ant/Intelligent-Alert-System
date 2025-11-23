import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB(): Promise<void> {
  const uri = config.mongoUri;
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("Disconnected MongoDB");
}
