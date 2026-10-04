const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      default: 'general',
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);