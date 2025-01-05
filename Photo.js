const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

const photoSchema = new mongoose.Schema({
  filename: String,
  path: String,
  originalname: String,
  mimetype: String,
  size: Number,
  created_at: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema]
});

const Photo = mongoose.model('Photo', photoSchema);
module.exports = Photo;