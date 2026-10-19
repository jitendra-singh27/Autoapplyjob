import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  role: { type: String, required: true, trim: true, maxlength: 160 },
  location: { type: String, default: '', trim: true, maxlength: 160 },
  jobUrl: { type: String, default: '', trim: true, maxlength: 2048 },
  status: { type: String, enum: ['Saved', 'Applied', 'In review', 'Interview', 'Offer', 'Rejected', 'Withdrawn'], default: 'Saved' },
  appliedAt: { type: Date, default: null },
  followUpAt: { type: Date, default: null },
  notes: { type: String, default: '', maxlength: 5000 },
  resumeVersion: { type: String, default: '', maxlength: 50000 }
}, { timestamps: true });
applicationSchema.index({ user: 1, updatedAt: -1 });
export default mongoose.model('Application', applicationSchema);
