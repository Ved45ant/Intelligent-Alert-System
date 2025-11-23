import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { UserModel } from "../models/User.js";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username, password } = req.body;
    const user = await UserModel.findOne(
      email ? { email } : { username }
    ).lean();
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    if (!user.passwordHash) {
      return res.status(401).json({ error: "Please use OAuth login" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user._id, username: user.username, email: user.email, role: user.role },
      config.jwtSecret,
      {
        expiresIn: "8h",
      }
    );

    return res.json({ token, username: user.username, email: user.email, role: user.role });
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

export async function createAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, username, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email & password required" });

    const exists = await UserModel.findOne({ $or: [{ email }, { username: username || email.split('@')[0] }] });
    if (exists) return res.status(400).json({ error: "user exists" });

    const hash = await bcrypt.hash(password, 10);
    const u = new UserModel({ 
      email, 
      username: username || email.split('@')[0], 
      passwordHash: hash, 
      role: "admin" 
    });
    await u.save();
    return res.status(201).json({ username: u.username, email: u.email, role: u.role });
  } catch (err) {
    next(err);
  }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: "Authentication failed" });

    const token = jwt.sign(
      { sub: user._id, username: user.username, email: user.email, role: user.role },
      config.jwtSecret,
      {
        expiresIn: "8h",
      }
    );

    res.redirect(`${config.frontendUrl}?token=${token}&username=${user.username}&role=${user.role}`);
  } catch (err) {
    next(err);
  }
}
