import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { generateText } from '../services/ai.js';

const router = Router();
router.use(requireAuth);
const boundedText = (max) => z.string().trim().min(1).max(max);

router.post('/tailor-resume', async (req, res) => {
  const parsed = z.object({ resumeText: boundedText(30000).optional(), jobDescription: boundedText(12000), targetRole: z.string().trim().max(160).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide your resume and the target job description.' });
  const resume = parsed.data.resumeText || req.user.resumeText;
  if (!resume?.trim()) return res.status(400).json({ error: 'Add your resume text in your profile or provide it with this request.' });
  const result = await generateText({
    instructions: `You are a careful career-writing assistant. Tailor a resume to a role using ONLY facts supported by the supplied resume. Never invent employers, dates, degrees, certifications, metrics, skills, or achievements. If information is missing, leave it out or mark [ADD IF ACCURATE]. Keep the result ATS-readable, plain text, concise, and professional. Return sections: TARGETED SUMMARY, CORE SKILLS, EXPERIENCE (rewritten bullets), KEYWORD GAPS TO ADDRESS HONESTLY, and CHANGE NOTES. Do not guarantee ATS scores or interviews.`,
    input: `Target role: ${parsed.data.targetRole || 'Not specified'}\n\nSOURCE RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${parsed.data.jobDescription}`
  });
  res.json({ tailoredResume: result, model: process.env.OPENAI_MODEL || 'gpt-5.5' });
});

router.post('/screening-answers', async (req, res) => {
  const parsed = z.object({ questions: z.array(boundedText(1000)).min(1).max(15), resumeText: boundedText(30000).optional(), jobDescription: z.string().trim().max(12000).optional(), tone: z.enum(['professional', 'friendly', 'concise']).default('professional') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide between 1 and 15 screening questions.' });
  const resume = parsed.data.resumeText || req.user.resumeText || '';
  const result = await generateText({
    instructions: `You help a candidate draft honest job application screening answers. Use only supported candidate facts from the resume and user-provided context. Never fabricate experience, work authorization, salary, location, notice period, eligibility, or achievements. For questions needing unknown personal facts, produce a clear [PLEASE CONFIRM: ...] placeholder rather than guessing. Tone: ${parsed.data.tone}. Return numbered questions and answers, preserving the question order. Keep each answer direct and editable.`,
    input: `CANDIDATE RESUME:\n${resume || '[No resume provided]'}\n\nJOB DESCRIPTION:\n${parsed.data.jobDescription || '[No job description provided]'}\n\nQUESTIONS:\n${parsed.data.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  });
  res.json({ answers: result, requiresReview: true, model: process.env.OPENAI_MODEL || 'gpt-5.5' });
});

router.post('/ats-review', async (req, res) => {
  const parsed = z.object({ resumeText: boundedText(30000).optional(), jobDescription: boundedText(12000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide resume text and a job description.' });
  const resume = parsed.data.resumeText || req.user.resumeText;
  if (!resume?.trim()) return res.status(400).json({ error: 'Add your resume text in your profile or provide it with this request.' });
  const result = await generateText({
    instructions: 'Review resume relevance against a job description. Do not claim to represent any real ATS vendor or guarantee a score. Return: estimatedMatch (integer 0-100), matchedKeywords (array of strings), missingKeywords (array of strings), strengths (array of strings), improvements (array of strings), and caveat (string). Only include a keyword as missing if it appears important in the job description and is not clearly present in the resume. Output valid JSON only.',
    input: `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${parsed.data.jobDescription}`
  });
  let review;
  try { review = JSON.parse(result); } catch { review = { estimatedMatch: null, matchedKeywords: [], missingKeywords: [], strengths: [], improvements: [result], caveat: 'AI-generated guidance only; not an actual ATS score.' }; }
  res.json({ review, model: process.env.OPENAI_MODEL || 'gpt-5.5' });
});
export default router;
