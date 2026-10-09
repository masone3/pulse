# Pulse

A real-time chat application built with WebSockets.

## Features

- Real-time messaging with Socket.IO
- JWT authentication for both REST routes and WebSocket connections
- Multiple chat rooms with per-room message history
- Live online-users list and typing indicators
- Emoji picker
- Image uploads via Cloudinary
- Passwords hashed with bcrypt, rate-limited auth routes

## Tech stack

Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT, Cloudinary, plain HTML/CSS/JS frontend

## Getting started

1. Clone the repo and install dependencies:
```bash
   git clone https://github.com/YOUR-USERNAME/pulse.git
   cd pulse
   npm install
```
2. Copy `.env.example` to `.env` and fill in your values.
3. Start the dev server:
```bash
   npm run dev
```
4. Open http://localhost:3000

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

## How it works

1. Users register or log in over REST and receive a JWT.
2. The client passes the JWT in the Socket.IO handshake; server middleware verifies it before the connection is accepted.
3. Messages are saved to MongoDB, then broadcast to the sender's room.
4. Images upload over HTTP to Cloudinary; only the resulting URL travels through the socket.

## Known limitations

- Rooms are a fixed list defined in `server.js`
- JWT is stored in localStorage (simple, but vulnerable if an XSS bug is ever introduced)
- No refresh tokens; tokens expire after 7 days