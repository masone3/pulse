const socket = io();

const joinScreen = document.getElementById('join-screen');
const chatScreen = document.getElementById('chat-screen');
const joinForm = document.getElementById('join-form');
const usernameInput = document.getElementById('username-input');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');

let myUsername = '';

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

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  myUsername = name;
  socket.emit('join', name);
  joinScreen.hidden = true;
  chatScreen.hidden = false;
  messageInput.focus();
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', text);
  messageInput.value = '';
});

socket.on('chat-message', addMessage);
socket.on('system-message', addSystemMessage);