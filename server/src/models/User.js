import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  headline: { type: String, default: '', maxlength: 160 },
  phone: { type: String, default: '', maxlength: 40 },
  location: { type: String, default: '', maxlength: 160 },
  linkedIn: { type: String, default: '', maxlength: 300 },
  github: { type: String, default: '', maxlength: 300 },
  portfolio: { type: String, default: '', maxlength: 300 },
  yearsExperience: { type: String, default: '', maxlength: 40 },
  resumeFileName: { type: String, default: '', maxlength: 255 },
  resumeUploadedAt: { type: Date, default: null },
  resumeText: { type: String, default: '', maxlength: 50000 },
  skills: { type: [String], default: [] }
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.__v; return ret; } } });

export default mongoose.model('User', userSchema);
