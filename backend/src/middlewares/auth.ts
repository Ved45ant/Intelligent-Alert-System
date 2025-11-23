import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function authMiddleware(requiredRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    let header = req.headers.authorization as string | undefined;
    
    if (!header && (req as any).query && (req as any).query.token) {
      header = `Bearer ${(req as any).query.token}`;
      req.headers.authorization = header;
    }

    if (!header || !header.startsWith("Bearer ")) {
      console.log("Auth failed: missing or invalid header", { header, path: req.path });
      return res.status(401).json({ error: "missing token" });
    }

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      (req as any).user = payload;
      if (
        requiredRoles &&
        requiredRoles.length > 0 &&
        !requiredRoles.includes(payload.role)
      ) {
        console.log("Auth failed: role forbidden", { required: requiredRoles, actual: payload.role });
        return res.status(403).json({ error: "forbidden" });
      }
      next();
    } catch (err) {
      console.log("Auth failed: token verification error", { 
        message: (err as Error).message, 
        jwtSecret: config.jwtSecret.slice(0, 10) + "...",
        tokenStart: token.slice(0, 20) + "..."
      });
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
