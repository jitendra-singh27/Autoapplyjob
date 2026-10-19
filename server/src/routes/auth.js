import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
const issueToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "applypilot-api",
    audience: "applypilot-client",
  });

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error:
        "Enter a name, valid email, and password with at least 10 characters.",
      details: parsed.error.flatten(),
    });
  const email = parsed.data.email.toLowerCase().trim();
  if (await User.exists({ email }))
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  const user = await User.create({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
  });
  res.status(201).json({ token: issueToken(user), user });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Enter a valid email and password." });
  const user = await User.findOne({
    email: parsed.data.email.toLowerCase().trim(),
  }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  res.json({ token: issueToken(user), user });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
router.patch("/me", requireAuth, async (req, res) => {
  const schema = z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      headline: z.string().trim().max(160).optional(),
      phone: z.string().trim().max(40).optional(),
      location: z.string().trim().max(160).optional(),
      linkedIn: z.string().trim().max(300).optional(),
      github: z.string().trim().max(300).optional(),
      portfolio: z.string().trim().max(300).optional(),
      yearsExperience: z.string().trim().max(40).optional(),
      resumeText: z.string().max(50000).optional(),
      skills: z.array(z.string().trim().max(80)).max(100).optional(),
    })
    .strict();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error: "Profile fields are invalid.",
      details: parsed.error.flatten(),
    });
  Object.assign(req.user, parsed.data);
  await req.user.save();
  res.json({ user: req.user });
});
export default router;
