require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const socketAuth = require('./middleware/socketAuth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.use(socketAuth);
connectDB();

app.use(express.json());
app.use(express.static('public'));
app.use('/api/auth', authRoutes);

io.on('connection', (socket) => {
  const { username } = socket.data;
  console.log(`User connected: ${username} (${socket.id})`);

  socket.broadcast.emit('system-message', `${username} joined the chat`);

  socket.on('chat-message', (text) => {
    const body = String(text || '').trim().slice(0, 500);
    if (!body) return;

    io.emit('chat-message', {
      username: socket.data.username,
      text: body,
      timestamp: new Date().toISOString(),
    });
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