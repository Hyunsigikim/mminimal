const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  position: { type: String, default: 'Member' }, // 직급
  address: { type: String, default: '' }, // 주소
  permissionLevel: { type: String, enum: ['Admin', 'Moderator', 'Member'], default: 'Member' }, // 권한등급
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
