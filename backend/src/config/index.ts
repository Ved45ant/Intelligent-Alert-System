import dotenv from "dotenv";
dotenv.config();

const config = {
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/Intelligent-alert",
  port: Number(process.env.PORT || 5001),
  jwtSecret: process.env.JWT_SECRET || "759532426febd60c19b4f46504cc0b89",
  workerCron: process.env.WORKER_CRON || "*/2 * * * *",
  alertExpiryHours: Number(process.env.ALERT_EXPIRY_HOURS || 24),
  dashboardCacheTtl: Number(process.env.DASHBOARD_CACHE_TTL || 30),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/api/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

export default config;
