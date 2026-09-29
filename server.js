require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (username) => {
    const name = String(username || '').trim().slice(0, 20);
    if (!name) return;

    socket.data.username = name;
    socket.broadcast.emit('system-message', `${name} joined the chat`);
  });

  socket.on('chat-message', (text) => {
    const username = socket.data.username;
    const body = String(text || '').trim().slice(0, 500);
    if (!username || !body) return;

    io.emit('chat-message', {
      username,
      text: body,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    const username = socket.data.username;
    if (username) {
      socket.broadcast.emit('system-message', `${username} left the chat`);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});