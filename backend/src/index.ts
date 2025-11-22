import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import config from "./config/index.js";
import alertsRouter from "./routes/alerts.js";
import authRouter from "./routes/auth.js";
import { startWorker } from "./services/worker.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import eventsRouter from "./routes/events.js";
import dashboardRouter from "./routes/dashboard.js";
import debugRouter from "./routes/debug.js";

dotenv.config();

export const app = express();
// security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());
app.use(express.json());

// health
app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// routes
app.use("/api/alerts", alertsRouter);
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use('/api/dashboard', dashboardRouter);
// mount debug routes in dev only
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRouter);
}

// error handler (after routes)
app.use(errorHandler);

let server: any = null;
async function start() {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'test') {
      startWorker();
    }
    const port = config.port || 4000;
    server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server started on port ${port}`);
      // Print a summary of mounted routes to help debugging 404s in dev
      try {
        const routes: string[] = [];
        // app._router may be undefined in some environments — guard carefully
        // @ts-ignore
        const stack = app && (app._router && app._router.stack) ? app._router.stack : null;
        if (stack && Array.isArray(stack)) {
          stack.forEach((middleware: any) => {
            try {
              if (middleware.route) {
                const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
                routes.push(`${methods} ${middleware.route.path}`);
              } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
                middleware.handle.stack.forEach((handler: any) => {
                  if (handler.route) {
                    const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
                    routes.push(`${methods} ${handler.route.path}`);
                  }
                });
              }
            } catch (_) {
              // ignore individual middleware enumeration errors
            }
          });
        } else {
          routes.push('<no router.stack available>');
        }
        routes.sort();
        // eslint-disable-next-line no-console
        console.log('Mounted routes:\n' + routes.join('\n'));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('Failed to enumerate routes on startup', e);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
export { server };
