import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { UserModel } from "../models/User.js";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username }).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user._id, username: user.username, role: user.role },
      config.jwtSecret,
      {
        expiresIn: "8h",
      }
    );

    return res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'missing token' });
    return res.json({ username: user.username, role: user.role, sub: user.sub });
  } catch (err) {
    next(err);
  }
}

// create admin user (demo). In production protect this.
export async function createAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username & password required" });

    const exists = await UserModel.findOne({ username });
    if (exists) return res.status(400).json({ error: "user exists" });

    const hash = await bcrypt.hash(password, 10);
    const u = new UserModel({ username, passwordHash: hash, role: "admin" });
    await u.save();
    return res.status(201).json({ username: u.username, role: u.role });
  } catch (err) {
    next(err);
  }
}
