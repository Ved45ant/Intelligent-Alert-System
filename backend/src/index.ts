import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";
import config from "./config/index.js";
import alertsRouter from "./routes/alerts.js";
import authRouter from "./routes/auth.js";
import { startWorker } from "./services/worker.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import eventsRouter from "./routes/events.js";
import dashboardRouter from "./routes/dashboard.js";
import debugRouter from "./routes/debug.js";
import { loadRules } from "./services/ruleEngine.js";

dotenv.config();

export const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

app.use("/api/alerts", alertsRouter);
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use('/api/dashboard', dashboardRouter);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRouter);
}

app.use(errorHandler);

let server: any = null;
async function start() {
  try {
    await connectDB();
    await loadRules();
    if (process.env.NODE_ENV !== 'test') {
      startWorker();
    }
    const port = config.port || 4000;
    server = app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
export { server };
