import dotenv from "dotenv";
dotenv.config();

const config = {
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/Intelligent-Alert",
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  workerCron: process.env.WORKER_CRON || "*/2 * * * *",
  alertExpiryHours: Number(process.env.ALERT_EXPIRY_HOURS || 24),
};

export default config;
