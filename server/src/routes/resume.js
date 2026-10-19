import { Router } from 'express';
import multer from 'multer';
import { createRequire } from 'node:module';
import mammoth from 'mammoth';
import { requireAuth } from '../middleware/auth.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const allowed = name.endsWith('.pdf') || name.endsWith('.docx');
    cb(allowed ? null : new Error('Upload a PDF or DOCX file.'), allowed);
  }
});

router.post('/upload', requireAuth, (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Resume must be 8 MB or smaller.' : 'Upload one resume file at a time.' });
      return res.status(400).json({ error: err.message || 'Could not upload resume.' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF or DOCX resume file.' });
  const name = req.file.originalname.toLowerCase();
  const buffer = req.file.buffer;
  let extracted = '';
  try {
    if (name.endsWith('.pdf')) {
      if (buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'This file does not appear to be a valid PDF.' });
      const result = await pdfParse(buffer);
      extracted = result.text || '';
    } else {
      // DOCX is a ZIP container; reject files without the expected ZIP signature.
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) return res.status(400).json({ error: 'This file does not appear to be a valid DOCX document.' });
      const result = await mammoth.extractRawText({ buffer });
      extracted = result.value || '';
    }
  } catch (error) {
    return res.status(422).json({ error: 'Could not read this resume. Try exporting it again as a text-based PDF or DOCX.' });
  }
  const resumeText = extracted.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 50000);
  if (resumeText.length < 40) return res.status(422).json({ error: 'Very little text was extracted. This may be a scanned PDF; use a text-based PDF or DOCX.' });
  req.user.resumeText = resumeText;
  req.user.resumeFileName = req.file.originalname.replace(/[\\/\r\n]/g, '_').slice(0, 255);
  req.user.resumeUploadedAt = new Date();
  await req.user.save();
  res.json({ message: 'Resume uploaded and parsed. Review the extracted text before using it.', fileName: req.user.resumeFileName, uploadedAt: req.user.resumeUploadedAt, characterCount: resumeText.length, resumeText, user: req.user });
});

router.get('/text', requireAuth, (req, res) => res.json({ resumeText: req.user.resumeText || '', fileName: req.user.resumeFileName || '', uploadedAt: req.user.resumeUploadedAt || null }));
router.delete('/', requireAuth, async (req, res) => {
  req.user.resumeText = '';
  req.user.resumeFileName = '';
  req.user.resumeUploadedAt = null;
  await req.user.save();
  res.json({ message: 'Saved resume text deleted.' });
});
export default router;
