import { Router } from 'express';
import { z } from 'zod';
import Application from '../models/Application.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const statuses = ['Saved', 'Applied', 'In review', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
const schema = z.object({ company: z.string().trim().min(1).max(160), role: z.string().trim().min(1).max(160), location: z.string().trim().max(160).optional(), jobUrl: z.string().trim().max(2048).optional(), status: z.enum(statuses).optional(), appliedAt: z.coerce.date().nullable().optional(), followUpAt: z.coerce.date().nullable().optional(), notes: z.string().max(5000).optional(), resumeVersion: z.string().max(50000).optional() }).strict();

router.get('/', async (req, res) => {
  const { status, q } = req.query;
  const filter = { user: req.user._id };
  if (status && statuses.includes(status)) filter.status = status;
  if (typeof q === 'string' && q.trim()) filter.$or = [{ company: { $regex: q.trim().slice(0, 80), $options: 'i' } }, { role: { $regex: q.trim().slice(0, 80), $options: 'i' } }];
  const items = await Application.find(filter).sort({ updatedAt: -1 }).limit(200);
  res.json({ applications: items });
});
router.get('/stats', async (req, res) => {
  const items = await Application.find({ user: req.user._id }).select('status followUpAt');
  const counts = Object.fromEntries(statuses.map((s) => [s, items.filter((i) => i.status === s).length]));
  const interviews = counts.Interview || 0;
  const applied = items.filter((i) => ['Applied', 'In review', 'Interview', 'Offer', 'Rejected'].includes(i.status)).length;
  const responded = items.filter((i) => ['In review', 'Interview', 'Offer', 'Rejected'].includes(i.status)).length;
  const followUpsDue = items.filter((i) => i.followUpAt && i.followUpAt <= new Date() && !['Offer', 'Rejected', 'Withdrawn'].includes(i.status)).length;
  res.json({ total: items.length, counts, interviews, responseRate: applied ? Math.round((responded / applied) * 1000) / 10 : 0, followUpsDue });
});
router.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Company and role are required. Check the other fields.', details: parsed.error.flatten() });
  const application = await Application.create({ ...parsed.data, user: req.user._id });
  res.status(201).json({ application });
});
router.get('/:id', async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json({ application });
});
router.patch('/:id', async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Application fields are invalid.', details: parsed.error.flatten() });
  const application = await Application.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: parsed.data }, { new: true, runValidators: true });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json({ application });
});
router.delete('/:id', async (req, res) => {
  const application = await Application.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json({ message: 'Application deleted.' });
});
export default router;
