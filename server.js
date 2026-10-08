require('dotenv').config();
require('./config/validateEnv')();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const socketAuth = require('./middleware/socketAuth');
const Message = require('./models/Message');
const uploadRoutes = require('./routes/upload');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);

const onlineUsers = new Map(); // socket.id -> { username, room }

io.use(socketAuth);
connectDB();

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static('public'));
app.use('/emoji-picker', express.static('node_modules/emoji-picker-element'));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadRoutes);

app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use('/emoji-picker', express.static('node_modules/emoji-picker-element'));
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

const multer = require('multer');

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5MB' : err.message;
    return res.status(400).json({ error: message });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: status < 500 ? err.message : 'Something went wrong',
  });
});

const ROOMS = ['general', 'random', 'tech'];

function broadcastPresence(room) {
  const usersInRoom = [...onlineUsers.values()]
    .filter((u) => u.room === room)
    .map((u) => u.username);

  io.to(room).emit('presence-update', usersInRoom);
}

io.on('connection', async (socket) => {
  const { username } = socket.data;
  socket.data.room = null;
  console.log(`User connected: ${username} (${socket.id})`);

  socket.emit('room-list', ROOMS);

  socket.on('join-room', async (roomName) => {
    if (!ROOMS.includes(roomName)) return;

    if (socket.data.room) {
      socket.leave(socket.data.room);
      socket.to(socket.data.room).emit('system-message', `${username} left the room`);
      broadcastPresence(socket.data.room);
    }

    socket.data.room = roomName;
    socket.join(roomName);
    onlineUsers.set(socket.id, { username, room: roomName });

    try {
      const recentMessages = await Message.find({ room: roomName })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const formatted = recentMessages.reverse().map((m) => ({
        username: m.username,
        text: m.text,
        imageUrl: m.imageUrl,
        timestamp: m.createdAt,
      }));

      socket.emit('chat-history', formatted);
    } catch (err) {
      console.error('Error loading history:', err.message);
    }

    socket.to(roomName).emit('system-message', `${username} joined the room`);
    broadcastPresence(roomName);
  });

  socket.on('chat-message', async (payload) => {
  const room = socket.data.room;
  if (!room) return;

  const { text, imageUrl } =
    payload && typeof payload === 'object' ? payload : {};

  const body = typeof text === 'string' ? text.trim().slice(0, 500) : '';
  const image = isValidImageUrl(imageUrl) ? imageUrl : null;

  if (!body && !image) return;

  try {
    const message = await Message.create({
      room,
      sender: socket.data.userId,
      username: socket.data.username,
      text: body,
      imageUrl: image,
    });

    io.to(room).emit('chat-message', {
      username: message.username,
      text: message.text,
      imageUrl: message.imageUrl,
      timestamp: message.createdAt,
    });
  } catch (err) {
    console.error('Error saving message:', err.message);
  }
});

  socket.on('typing', () => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit('user-typing', username);
    }
  });

  socket.on('stop-typing', () => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit('user-stop-typing', username);
    }
  });

  socket.on('disconnect', () => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit('system-message', `${username} left the room`);
      onlineUsers.delete(socket.id);
      broadcastPresence(socket.data.room);
    }
    console.log(`User disconnected: ${username} (${socket.id})`);
  });
});

function isValidImageUrl(url) {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/`)
    );
  } catch {
    return false;
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});