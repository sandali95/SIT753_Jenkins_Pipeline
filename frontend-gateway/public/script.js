// public/script.js

let token = localStorage.getItem('token') || '';

// DOM refs
const authSection  = document.getElementById('auth-section');
const todoSection  = document.getElementById('todo-section');
const authError    = document.getElementById('auth-error');
const usernameEl   = document.getElementById('username');
const passwordEl   = document.getElementById('password');
const signupBtn    = document.getElementById('signup-btn');
const loginBtn     = document.getElementById('login-btn');
const logoutBtn    = document.getElementById('logout-btn');
const newTodoEl    = document.getElementById('newTodo');
const addBtn       = document.getElementById('add-btn');
const todoListEl   = document.getElementById('todo-list');


document.addEventListener('DOMContentLoaded', () => {
  token ? _showTodos() : _showAuth();
});

// ─── Auth Handlers ─────────────────────────────────────────────────────────────
signupBtn.addEventListener('click', async () => {
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();
  if (!username || !password) return authError.textContent = 'Username & password required';

  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.status === 201) {
    authError.style.color = 'green';
    authError.textContent = 'Signup successful—please log in.';
  } else {
    authError.style.color = 'var(--danger)';
    authError.textContent = data.error || 'Signup failed';
  }
});

loginBtn.addEventListener('click', async () => {
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();
  if (!username || !password) return authError.textContent = 'Username & password required';

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok && data.token) {
    token = data.token;
    localStorage.setItem('token', token);
    _showTodos();
  } else {
    authError.textContent = data.error || 'Login failed';
  }
});

logoutBtn.addEventListener('click', () => {
  token = '';
  localStorage.removeItem('token');
  _showAuth();
});

// ─── Todo CRUD ────────────────────────────────────────────────────────────────
addBtn.addEventListener('click', async () => {
  const title = newTodoEl.value.trim();
  if (!title) return;

  await fetch('/todos', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title })
  });
  newTodoEl.value = '';
  _loadTodos();
});



async function _loadTodos() {
  const res = await fetch('/todos', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const todos = await res.json();
  _renderTodos(todos);
}

function _renderTodos(todos) {
  todoListEl.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;    // entry animation
    li.style.opacity = 0;
    li.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      li.style.transition = 'all 0.3s';
      li.style.opacity = 1;
      li.style.transform = '';
    });

    // checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = todo.completed;
    cb.addEventListener('change', () => _toggleTodo(todo._id));

    // text
    const span = document.createElement('span');
    span.className = 'text';
    span.textContent = todo.title;

    // delete button
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = 'X';
    del.addEventListener('click', () => _deleteTodo(todo._id));

    li.append(cb, span, del);
    todoListEl.append(li);
  });
}

function _toggleTodo(id) {
  return fetch(`/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(_loadTodos);
}

function _deleteTodo(id) {
  return fetch(`/todos/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(_loadTodos);
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function _showAuth() {
  authSection.classList.remove('hidden');
  todoSection.classList.add('hidden');
}
function _showTodos() {
  authError.textContent = '';
  authSection.classList.add('hidden');
  todoSection.classList.remove('hidden');
  _loadTodos();
}
