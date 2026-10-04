require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const socketAuth = require('./middleware/socketAuth');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.use(socketAuth);
connectDB();

app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', authRoutes);

io.on('connection', async (socket) => {
  const { username } = socket.data;
  console.log(`User connected: ${username} (${socket.id})`);

  try {
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formatted = recentMessages.reverse().map((m) => ({
      username: m.username,
      text: m.text,
      timestamp: m.createdAt,
    }));

    socket.emit('chat-history', formatted);
  } catch (err) {
    console.error('Error loading history:', err.message);
  }

  socket.broadcast.emit('system-message', `${username} joined the chat`);

  socket.on('chat-message', async (text) => {
    const body = String(text || '').trim().slice(0, 500);
    if (!body) return;

    try {
      const message = await Message.create({
        sender: socket.data.userId,
        username: socket.data.username,
        text: body,
      });

      io.emit('chat-message', {
        username: message.username,
        text: message.text,
        timestamp: message.createdAt,
      });
    } catch (err) {
      console.error('Error saving message:', err.message);
    }
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('system-message', `${username} left the chat`);
    console.log(`User disconnected: ${username} (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});