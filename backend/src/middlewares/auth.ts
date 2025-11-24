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
        return res.status(403).json({ error: "forbidden" });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
