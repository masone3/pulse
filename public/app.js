const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const toggleModeBtn = document.getElementById('toggle-mode');
const logoutBtn = document.getElementById('logout-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');
const userListEl = document.getElementById('user-list');

let isRegisterMode = false;
let socket = null;
let myUsername = '';

const typingIndicator = document.getElementById('typing-indicator');
let typingTimeout = null;
const typingUsers = new Set();

function getUsernameFromToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.username;
  } catch {
    return null;
  }
}

toggleModeBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authSubmit.textContent = isRegisterMode ? 'Register' : 'Log in';
  toggleModeBtn.textContent = isRegisterMode
    ? 'Already have an account? Log in'
    : 'Need an account? Register';
  authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data.errors ? data.errors[0].msg : data.error;
      authError.textContent = message || 'Something went wrong';
      return;
    }

    localStorage.setItem('pulse_token', data.token);
    connectSocket(data.token);
  } catch (err) {
    authError.textContent = 'Could not reach the server';
  }
});

function updateTypingIndicator() {
  if (typingUsers.size === 0) {
    typingIndicator.textContent = '';
  } else {
    typingIndicator.textContent = `${[...typingUsers].join(', ')} typing...`;
  }
}

function connectSocket(token) {
  myUsername = getUsernameFromToken(token);
  socket = io({ auth: { token } });

  const roomListEl = document.getElementById('room-list');
  const currentRoomEl = document.getElementById('current-room');

  let currentRoom = null;

  socket.on('room-list', (rooms) => {
    roomListEl.innerHTML = '';
    rooms.forEach((room) => {
      const li = document.createElement('li');
      li.textContent = room;
      li.classList.add('room-item');
      li.addEventListener('click', () => joinRoom(room));
      roomListEl.appendChild(li);
    });

    if (!currentRoom) joinRoom(rooms[0]);
  });

  socket.on('user-typing', (name) => {
    typingUsers.add(name);
    updateTypingIndicator();
  });

  socket.on('user-stop-typing', (name) => {
    typingUsers.delete(name);
    updateTypingIndicator();
  });

  function joinRoom(room) {
    currentRoom = room;
    currentRoomEl.textContent = `# ${room}`;
    socket.emit('join-room', room);

    document.querySelectorAll('.room-item').forEach((el) => {
      el.classList.toggle('active', el.textContent === room);
    });
  }

  socket.on('presence-update', (usernames) => {
    userListEl.innerHTML = '';
    usernames.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      userListEl.appendChild(li);
    });
  });

  socket.on('connect', () => {
    authScreen.hidden = true;
    chatScreen.hidden = false;
    messageInput.focus();
  });

  socket.on('connect_error', (err) => {
    localStorage.removeItem('pulse_token');
    authError.textContent = err.message || 'Connection failed';
    authScreen.hidden = false;
    chatScreen.hidden = true;
  });

  socket.on('chat-history', (history) => {
    messages.innerHTML = '';
    history.forEach(addMessage);
  });

  socket.on('chat-message', addMessage);
  socket.on('system-message', addSystemMessage);
}

function addMessage({ username, text, timestamp }) {
  const li = document.createElement('li');
  li.classList.add('message');
  if (username === myUsername) li.classList.add('mine');

  const meta = document.createElement('span');
  meta.classList.add('meta');
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  meta.textContent = `${username} · ${time}`;

  const body = document.createElement('div');
  body.textContent = text;

  li.append(meta, body);
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(text) {
  const li = document.createElement('li');
  li.classList.add('system');
  li.textContent = text;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', text);
  socket.emit('stop-typing');
  clearTimeout(typingTimeout);
  messageInput.value = '';
});

messageInput.addEventListener('input', () => {
  socket.emit('typing');

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing');
  }, 1500);
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('pulse_token');
  if (socket) socket.disconnect();
  location.reload();
});

const savedToken = localStorage.getItem('pulse_token');
if (savedToken) {
  connectSocket(savedToken);
}