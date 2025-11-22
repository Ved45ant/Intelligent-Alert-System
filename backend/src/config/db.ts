import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB(): Promise<void> {
  const uri = config.mongoUri;
  await mongoose.connect(uri, {
    // useNewUrlParser, useUnifiedTopology are defaults in mongoose v7+
  });
  // eslint-disable-next-line no-console
  console.log("Connected to MongoDB");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  // eslint-disable-next-line no-console
  console.log("Disconnected MongoDB");
}
