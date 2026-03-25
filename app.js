/* ============================================================
   Aria – Personal AI Assistant | app.js
   All frontend logic: chat, tasks, reminders, modals, toast
   Gemini API calls are proxied through server.js (localhost:3000)
   ============================================================ */

// ─── State ───────────────────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('aria-tasks') || '[]');
let reminders = JSON.parse(localStorage.getItem('aria-reminders') || '[]');
let activeTab = 'chat';
let taskFilter = 'all';
let deleteTarget = null; // { type: 'task'|'reminder', id }

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  renderReminders();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(checkReminders, 30000); // check every 30s
  checkReminders();
  switchTab('chat');
});

// ─── Clock ───────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Tab switching ───────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  ['chat', 'tasks', 'reminders'].forEach(t => {
    const panel = document.getElementById(`panel-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (panel) { panel.classList.toggle('active', t === tab); panel.classList.toggle('hidden', t !== tab); }
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function toggleMobileMenu() {
  document.getElementById('mobile-nav').classList.toggle('hidden');
}

// ─── CHAT ────────────────────────────────────────────────────
const botName = 'Aria';

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 128) + 'px';
}

function sendQuickPrompt(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  appendMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  // Hide quick prompts after first message
  const qp = document.getElementById('quick-prompts');
  if (qp) qp.style.display = 'none';

  // Show typing indicator
  const typingId = showTyping();

  try {
    const response = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text }),
    });
    const data = await response.json();
    removeTyping(typingId);
    const reply = data.reply || data.error || 'Sorry, I received an unexpected response.';
    appendMessage('bot', reply);
  } catch (error) {
    removeTyping(typingId);
    appendMessage('bot', 'Sorry, I couldn\'t connect to the AI service. Please check if the server is running.');
    console.error(error);
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (role === 'user') {
    const el = document.createElement('div');
    el.className = 'flex justify-end chat-msg';
    el.innerHTML = `
      <div class="max-w-[78%]">
        <div class="user-bubble rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">${escapeHtml(text)}</div>
        <p class="text-xs text-surface-100/30 mt-1.5 text-right mr-1">${now}</p>
      </div>`;
    container.appendChild(el);
  } else {
    const el = document.createElement('div');
    el.className = 'flex gap-3 chat-msg';
    el.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 mt-0.5" style="background:linear-gradient(135deg,#6236ff,#5220f5)">
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
      </div>
      <div class="max-w-[80%]">
        <div class="ai-bubble rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">${text}</div>
        <p class="text-xs text-surface-100/30 mt-1.5 ml-1">${now}</p>
      </div>`;
    container.appendChild(el);
  }
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'flex gap-3 chat-msg';
  el.innerHTML = `
    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#6236ff,#5220f5)">
      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
      </svg>
    </div>
    <div class="ai-bubble rounded-2xl rounded-tl-sm px-4 py-3">
      <div class="typing-dots flex gap-1.5 items-center h-4">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  const container = document.getElementById('chat-messages');
  // Keep only welcome message
  const welcome = document.getElementById('welcome-msg');
  container.innerHTML = '';
  if (welcome) container.appendChild(welcome);
  const qp = document.getElementById('quick-prompts');
  if (qp) qp.style.display = '';
}

// ─── Bot Reply Logic (Static – swap with Gemini API call) ──────
function getBotReply(text) {
  const t = text.toLowerCase();

  // Task commands
  if (t.includes('show') && (t.includes('task') || t.includes('todo'))) {
    if (tasks.length === 0) return "📋 You have no tasks yet. Would you like to <a href='#' onclick=\"switchTab('tasks'); openTaskModal(); return false;\" class='text-brand-300 underline'>add one</a>?";
    const list = tasks.map((tk, i) =>
      `${i + 1}. ${tk.completed ? '✅' : '🔲'} <strong>${escapeHtml(tk.title)}</strong>${tk.due ? ` <span class='text-brand-400/70'>(Due: ${tk.due})</span>` : ''}`
    ).join('<br>');
    return `📋 Here are your tasks:<br><br>${list}`;
  }

  if ((t.includes('add') || t.includes('create') || t.includes('new')) && t.includes('task')) {
    switchTab('tasks');
    setTimeout(() => openTaskModal(), 100);
    return "Sure! I've opened the <strong>Add Task</strong> form for you. Fill in the details and save it!";
  }

  if (t.includes('delete') && t.includes('task')) {
    switchTab('tasks');
    return "I've navigated you to the <strong>Tasks</strong> panel. Click the 🗑️ icon next to any task to delete it.";
  }

  // Reminder commands
  if (t.includes('show') && (t.includes('reminder') || t.includes('remind'))) {
    if (reminders.length === 0) return "🔔 You have no reminders set. Would you like to <a href='#' onclick=\"switchTab('reminders'); openReminderModal(); return false;\" class='text-violet-300 underline'>add one</a>?";
    const list = reminders.map((r, i) =>
      `${i + 1}. 🔔 <strong>${escapeHtml(r.title)}</strong> – ${formatReminderDate(r.date, r.time)}`
    ).join('<br>');
    return `🔔 Your reminders:<br><br>${list}`;
  }

  if ((t.includes('add') || t.includes('set') || t.includes('create')) && (t.includes('reminder') || t.includes('remind'))) {
    switchTab('reminders');
    setTimeout(() => openReminderModal(), 100);
    return "Got it! I've opened the <strong>Add Reminder</strong> form. Set the time and I'll keep track of it for you!";
  }

  // Time / Date
  if (t.includes('time') || t.match(/what.*time/)) {
    const now = new Date();
    return `🕐 It's currently <strong>${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.`;
  }
  if (t.includes('date') || t.includes('today') || t.match(/what.*day/)) {
    const now = new Date();
    return `📅 Today is <strong>${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.`;
  }

  // Greeting
  if (t.match(/^(hi|hello|hey|howdy|sup|what's up)/)) {
    const greets = ["👋 Hello! How can I help you today?", "Hey there! What would you like to do?", "Hi! Ready to help you stay organized. 😊"];
    return greets[Math.floor(Math.random() * greets.length)];
  }

  // Help
  if (t.includes('help') || t.includes('what can you do')) {
    return `I can help you with:<br><br>
      📋 <strong>Tasks</strong> – "Show my tasks", "Add task", "Delete task"<br>
      🔔 <strong>Reminders</strong> – "Show reminders", "Add reminder"<br>
      📅 <strong>Date & Time</strong> – "What time is it?", "What's today's date?"<br><br>
      <em class='text-surface-100/50'>Connect the Gemini API in your Node.js backend to unlock full AI capabilities!</em>`;
  }

  // Counting
  if (t.includes('how many task')) {
    const done = tasks.filter(t => t.completed).length;
    return `📊 You have <strong>${tasks.length}</strong> task(s) total — <strong>${done}</strong> completed and <strong>${tasks.length - done}</strong> active.`;
  }

  // Fallback (placeholder for Gemini API)
  const fallbacks = [
    "That's a great question! 🤔 Connect me to the Gemini API in your Node.js backend and I'll give you a full answer.",
    "I'm not quite sure how to answer that yet — once you integrate the Gemini API, I'll be much smarter! 🧠",
    "Interesting! Once connected to the Gemini API, I can answer any question you throw at me. 🚀",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── TASKS ───────────────────────────────────────────────────
function saveTasks() { localStorage.setItem('aria-tasks', JSON.stringify(tasks)); }

function openTaskModal(editId) {
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due').value = '';
  document.getElementById('task-edit-id').value = '';
  document.getElementById('task-modal-title').textContent = 'Add New Task';

  if (editId) {
    const tk = tasks.find(t => t.id === editId);
    if (tk) {
      document.getElementById('task-title').value = tk.title;
      document.getElementById('task-desc').value = tk.desc || '';
      document.getElementById('task-priority').value = tk.priority || 'medium';
      document.getElementById('task-due').value = tk.due || '';
      document.getElementById('task-edit-id').value = editId;
      document.getElementById('task-modal-title').textContent = 'Edit Task';
    }
  }
  setTimeout(() => document.getElementById('task-title').focus(), 50);
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
}

function saveTask(e) {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const due = document.getElementById('task-due').value;
  const editId = document.getElementById('task-edit-id').value;

  if (!title) return;

  if (editId) {
    const idx = tasks.findIndex(t => t.id === editId);
    if (idx > -1) {
      tasks[idx] = { ...tasks[idx], title, desc, priority, due };
      showToast('Task updated!', 'success');
    }
  } else {
    tasks.unshift({ id: uid(), title, desc, priority, due, completed: false, createdAt: Date.now() });
    showToast('Task added!', 'success');
  }

  saveTasks();
  renderTasks();
  closeTaskModal();
}

function toggleTask(id) {
  const tk = tasks.find(t => t.id === id);
  if (tk) { tk.completed = !tk.completed; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  deleteTarget = { type: 'task', id };
  document.getElementById('delete-modal').classList.remove('hidden');
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('tasks-empty');
  const countEl = document.getElementById('task-count-text');

  let filtered = tasks;
  if (taskFilter === 'active') filtered = tasks.filter(t => !t.completed);
  if (taskFilter === 'completed') filtered = tasks.filter(t => t.completed);

  // Remove old cards (keep empty placeholder in DOM)
  list.querySelectorAll('.task-card').forEach(c => c.remove());

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    filtered.forEach(tk => {
      const card = document.createElement('div');
      card.className = `task-card${tk.completed ? ' completed' : ''}`;
      card.id = `task-${tk.id}`;
      const priorityColors = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high' };
      const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High' };
      card.innerHTML = `
        <input type="checkbox" class="task-check" ${tk.completed ? 'checked' : ''} onchange="toggleTask('${tk.id}')" id="check-${tk.id}"/>
        <div class="flex-1 min-w-0">
          <p class="task-title text-sm font-medium text-white truncate">${escapeHtml(tk.title)}</p>
          ${tk.desc ? `<p class="text-xs text-surface-100/45 mt-0.5 truncate">${escapeHtml(tk.desc)}</p>` : ''}
          <div class="flex items-center gap-3 mt-1.5">
            <span class="flex items-center gap-1 text-xs text-surface-100/40">
              <span class="priority-dot ${priorityColors[tk.priority || 'medium']}"></span>${priorityLabels[tk.priority || 'medium']}
            </span>
            ${tk.due ? `<span class="text-xs text-surface-100/35">📅 ${formatDueDate(tk.due)}</span>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="openTaskModal('${tk.id}')" class="action-btn" title="Edit">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteTask('${tk.id}')" class="action-btn delete-btn" title="Delete">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>`;
      list.insertBefore(card, empty);
    });
  }

  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  if (countEl) countEl.textContent = `${total} task${total !== 1 ? 's' : ''} total · ${done} completed`;
}

function filterTasks(f) {
  taskFilter = f;
  ['all', 'active', 'completed'].forEach(id => {
    const btn = document.getElementById(`filter-${id}`);
    if (btn) btn.classList.toggle('active', id === f);
  });
  renderTasks();
}

// ─── REMINDERS ───────────────────────────────────────────────
function saveReminders() { localStorage.setItem('aria-reminders', JSON.stringify(reminders)); }

function openReminderModal(editId) {
  document.getElementById('reminder-modal').classList.remove('hidden');
  document.getElementById('reminder-title').value = '';
  document.getElementById('reminder-note').value = '';
  document.getElementById('reminder-date').value = '';
  document.getElementById('reminder-time').value = '';
  document.getElementById('reminder-edit-id').value = '';
  document.getElementById('reminder-modal-title').textContent = 'Add Reminder';

  if (editId) {
    const r = reminders.find(r => r.id === editId);
    if (r) {
      document.getElementById('reminder-title').value = r.title;
      document.getElementById('reminder-note').value = r.note || '';
      document.getElementById('reminder-date').value = r.date;
      document.getElementById('reminder-time').value = r.time;
      document.getElementById('reminder-edit-id').value = editId;
      document.getElementById('reminder-modal-title').textContent = 'Edit Reminder';
    }
  }
  setTimeout(() => document.getElementById('reminder-title').focus(), 50);
}

function closeReminderModal() {
  document.getElementById('reminder-modal').classList.add('hidden');
}

function saveReminder(e) {
  e.preventDefault();
  const title = document.getElementById('reminder-title').value.trim();
  const note = document.getElementById('reminder-note').value.trim();
  const date = document.getElementById('reminder-date').value;
  const time = document.getElementById('reminder-time').value;
  const editId = document.getElementById('reminder-edit-id').value;

  if (!title || !date || !time) return;

  if (editId) {
    const idx = reminders.findIndex(r => r.id === editId);
    if (idx > -1) {
      reminders[idx] = { ...reminders[idx], title, note, date, time };
      showToast('Reminder updated!', 'success');
    }
  } else {
    reminders.unshift({ id: uid(), title, note, date, time, rang: false, createdAt: Date.now() });
    showToast('Reminder set! 🔔', 'success');
  }

  saveReminders();
  renderReminders();
  closeReminderModal();
}

function deleteReminder(id) {
  deleteTarget = { type: 'reminder', id };
  document.getElementById('delete-modal').classList.remove('hidden');
}

function renderReminders() {
  const list = document.getElementById('reminder-list');
  const empty = document.getElementById('reminders-empty');
  const countEl = document.getElementById('reminder-count-text');

  list.querySelectorAll('.reminder-card').forEach(c => c.remove());

  if (reminders.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');

    // Sort: upcoming first
    const sorted = [...reminders].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`);
      const db = new Date(`${b.date}T${b.time}`);
      return da - db;
    });

    sorted.forEach(r => {
      const card = document.createElement('div');
      card.className = `reminder-card${r.rang ? ' rang' : ''}`;
      card.id = `reminder-${r.id}`;
      const dt = new Date(`${r.date}T${r.time}`);
      const isPast = dt < new Date();
      card.innerHTML = `
        <div class="reminder-icon">
          <svg class="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">${escapeHtml(r.title)}</p>
          ${r.note ? `<p class="text-xs text-surface-100/45 mt-0.5 truncate">${escapeHtml(r.note)}</p>` : ''}
          <p class="text-xs mt-1 ${isPast ? 'text-red-400/70' : 'text-violet-400/70'}">
            ${isPast ? '⚠️ Overdue · ' : '⏰ '}${formatReminderDate(r.date, r.time)}
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="openReminderModal('${r.id}')" class="action-btn" title="Edit">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteReminder('${r.id}')" class="action-btn delete-btn" title="Delete">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>`;
      list.insertBefore(card, empty);
    });
  }

  if (countEl) countEl.textContent = `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''} set`;
}

function checkReminders() {
  const now = new Date();
  let changed = false;
  reminders.forEach(r => {
    if (!r.rang) {
      const dt = new Date(`${r.date}T${r.time}`);
      if (dt <= now) {
        r.rang = true;
        changed = true;
        showToast(`🔔 Reminder: ${r.title}`, 'reminder');
        // Browser notification (if permission granted)
        if (Notification && Notification.permission === 'granted') {
          new Notification(`Aria Reminder`, { body: r.title });
        }
      }
    }
  });
  if (changed) { saveReminders(); renderReminders(); }

  // Request notification permission (silent, non-blocking)
  if (Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── Delete Modal ─────────────────────────────────────────────
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  deleteTarget = null;
}

function confirmDelete() {
  if (!deleteTarget) return;
  if (deleteTarget.type === 'task') {
    tasks = tasks.filter(t => t.id !== deleteTarget.id);
    saveTasks(); renderTasks();
    showToast('Task deleted.', 'info');
  } else if (deleteTarget.type === 'reminder') {
    reminders = reminders.filter(r => r.id !== deleteTarget.id);
    saveReminders(); renderReminders();
    showToast('Reminder deleted.', 'info');
  }
  closeDeleteModal();
}

// ─── Toast ────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  const toastInner = document.getElementById('toast-inner');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  const icons = { success: '✓', info: 'ℹ', reminder: '🔔', error: '✕' };
  const colors = {
    success: 'border-emerald-500/30 text-white',
    info: 'border-white/10 text-white',
    reminder: 'border-violet-500/40 text-white',
    error: 'border-red-500/30 text-white',
  };

  toastIcon.textContent = icons[type] || '✓';
  toastMsg.textContent = msg;
  toastInner.className = `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl glass-toast border ${colors[type] || colors.success}`;

  toast.classList.remove('hidden');
  toast.style.animation = 'slideUp 0.3s ease forwards';

  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// ─── Helpers ──────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReminderDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
