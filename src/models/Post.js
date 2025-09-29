const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Board' },
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  // Deprecated single image; kept for backward compatibility
  imageUrl: { type: String },
  // New: multiple images support
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
