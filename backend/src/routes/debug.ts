import { Router } from "express";

const router = Router();

router.get("/routes", (req, res) => {
  const app: any = req.app;
  const routes: string[] = [];
  try {
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(",");
        routes.push(`${methods.toUpperCase()} ${middleware.route.path}`);
      } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(",");
            routes.push(`${methods.toUpperCase()} ${handler.route.path}`);
          }
        });
      }
    });
  } catch (e) {
    return res.status(500).json({ error: "failed to enumerate routes", details: String(e) });
  }
  routes.sort();
  res.json({ routes });
});

export default router;
