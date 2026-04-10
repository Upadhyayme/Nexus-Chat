// ============================================================
//  script.js — Nexus Chat v2
//  NEW FEATURES:
//    1. Reply on specific messages (WhatsApp-style)
//    2. Quick emoji reactions with toggle & counts
//    3. Eye-catcher notification bubble when tab is hidden
// ============================================================

const socket = io();

// ── DOM References ───────────────────────────────────────────
const joinScreen      = document.getElementById("join-screen");
const chatScreen      = document.getElementById("chat-screen");
const usernameInput   = document.getElementById("username-input");
const roomInput       = document.getElementById("room-input");
const joinBtn         = document.getElementById("join-btn");
const usernameError   = document.getElementById("username-error");
const roomError       = document.getElementById("room-error");

const messagesEl      = document.getElementById("messages");
const msgInput        = document.getElementById("msg-input");
const sendBtn         = document.getElementById("send-btn");
const leaveBtn        = document.getElementById("leave-btn");
const userListEl      = document.getElementById("user-list");
const userCountEl     = document.getElementById("user-count");
const roomDisplayEl   = document.getElementById("room-display");
const chatRoomName    = document.getElementById("chat-room-name");
const headerUsername  = document.getElementById("header-username");
const typingIndicator = document.getElementById("typing-indicator");
const typingText      = document.getElementById("typing-text");
const emojiBtn        = document.getElementById("emoji-btn");
const emojiPicker     = document.getElementById("emoji-picker");
const emojiGrid       = document.querySelector(".emoji-grid");
const sidebarToggle   = document.getElementById("sidebar-toggle");
const sidebar         = document.querySelector(".sidebar");

// Reply bar
const replyBar        = document.getElementById("reply-bar");
const replyToName     = document.getElementById("reply-to-name");
const replyToText     = document.getElementById("reply-to-text");
const replyCancelBtn  = document.getElementById("reply-cancel-btn");

// Reaction picker popup
const reactionPopup   = document.getElementById("reaction-picker-popup");

// Notification bubble
const notifBubble     = document.getElementById("notif-bubble");
const notifPreview    = document.getElementById("notif-preview");
const notifClose      = document.getElementById("notif-close");

// ── App State ────────────────────────────────────────────────
let currentUsername   = "";
let currentRoom       = "";
let typingTimeout     = null;
let isTyping          = false;

// Reply state
let replyTarget       = null;  // { id, username, text } or null

// Reaction picker state
let reactionPickerMsg = null;  // msgId the picker is targeting
let reactionPickerClose = null;

// Notification state
let notifHideTimer    = null;
let tabHidden         = false;

// ── Emoji Picker (text input) ────────────────────────────────
const emojiChars = emojiGrid.textContent.trim().split(/\s+/).filter(Boolean);
emojiGrid.textContent = "";
emojiChars.forEach((emoji) => {
  const span = document.createElement("span");
  span.className = "emoji-item";
  span.textContent = emoji;
  span.addEventListener("click", () => {
    insertAtCursor(msgInput, emoji);
    closeEmojiPicker();
  });
  emojiGrid.appendChild(span);
});

emojiBtn.addEventListener("click", (e) => { e.stopPropagation(); emojiPicker.classList.toggle("open"); });
document.addEventListener("click", () => { closeEmojiPicker(); closeReactionPicker(); });
emojiPicker.addEventListener("click", (e) => e.stopPropagation());
reactionPopup.addEventListener("click", (e) => e.stopPropagation());

function closeEmojiPicker() { emojiPicker.classList.remove("open"); }

function insertAtCursor(input, text) {
  const s = input.selectionStart, e = input.selectionEnd;
  input.value = input.value.slice(0, s) + text + input.value.slice(e);
  input.focus();
  input.selectionStart = input.selectionEnd = s + text.length;
}

// ── Sidebar toggle (mobile) ──────────────────────────────────
sidebarToggle.addEventListener("click", (e) => { e.stopPropagation(); sidebar.classList.toggle("open"); });
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 640 && !sidebar.contains(e.target)) sidebar.classList.remove("open");
});

// ════════════════════════════════════════════════════════════
//  JOIN / LEAVE
// ════════════════════════════════════════════════════════════
joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") roomInput.focus(); });
roomInput.addEventListener("keydown",     (e) => { if (e.key === "Enter") handleJoin(); });

function handleJoin() {
  usernameError.textContent = "";
  roomError.textContent = "";
  const username = usernameInput.value.trim();
  const room     = roomInput.value.trim();
  let err = false;
  if (!username) { usernameError.textContent = "Please enter a username."; err = true; }
  if (!room)     { roomError.textContent     = "Please enter a room name."; err = true; }
  if (err) return;

  currentUsername = username;
  currentRoom     = room;

  socket.emit("joinRoom", { username, room });

  const displayRoom = "#" + room.toLowerCase().replace(/\s+/g, "-");
  roomDisplayEl.textContent  = displayRoom;
  chatRoomName.textContent   = displayRoom;
  headerUsername.textContent = "@" + username;

  switchScreen("chat");
  setTimeout(() => msgInput.focus(), 300);
}

function switchScreen(target) {
  joinScreen.style.opacity = "0";
  setTimeout(() => {
    joinScreen.classList.remove("active");
    if (target === "chat") {
      chatScreen.classList.add("active");
      requestAnimationFrame(() => (chatScreen.style.opacity = "1"));
    }
  }, 300);
}

leaveBtn.addEventListener("click", () => {
  socket.disconnect();
  socket.connect();
  messagesEl.innerHTML = "";
  userListEl.innerHTML = "";
  userCountEl.textContent = "0";
  currentUsername = ""; currentRoom = "";
  usernameInput.value = ""; roomInput.value = "";
  cancelReply();

  chatScreen.style.opacity = "0";
  setTimeout(() => {
    chatScreen.classList.remove("active");
    joinScreen.classList.add("active");
    joinScreen.style.opacity = "0";
    requestAnimationFrame(() => (joinScreen.style.opacity = "1"));
    usernameInput.focus();
  }, 300);
});

// ════════════════════════════════════════════════════════════
//  SEND MESSAGE
// ════════════════════════════════════════════════════════════
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  // Include replyTo context if replying
  socket.emit("chatMessage", {
    text,
    replyTo: replyTarget || null,
  });

  msgInput.value = "";
  handleStopTyping();
  closeEmojiPicker();
  cancelReply();
  msgInput.focus();
}

// ════════════════════════════════════════════════════════════
//  FEATURE 1 — REPLY SYSTEM
// ════════════════════════════════════════════════════════════

/**
 * Called when the user clicks "↩ Reply" on a message action bar.
 * Stores the reply target and shows the preview bar above the input.
 */
function startReply(msgId, username, text) {
  replyTarget = { id: msgId, username, text };

  replyToName.textContent = username;
  replyToText.textContent = text;
  replyBar.style.display  = "block";

  msgInput.focus();
}

function cancelReply() {
  replyTarget            = null;
  replyBar.style.display = "none";
  replyToName.textContent = "";
  replyToText.textContent = "";
}

replyCancelBtn.addEventListener("click", cancelReply);

/**
 * When a user clicks the reply quote inside a bubble,
 * scroll and highlight the original message.
 */
function jumpToMessage(msgId) {
  const target = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("highlight-flash");
  void target.offsetWidth; // force reflow to restart animation
  target.classList.add("highlight-flash");
}

// ════════════════════════════════════════════════════════════
//  FEATURE 2 — QUICK REACTIONS
// ════════════════════════════════════════════════════════════

/**
 * Open the reaction picker popup near the clicked button.
 */
function openReactionPicker(msgId, anchorEl) {
  // Close any previously open picker
  closeReactionPicker();

  reactionPickerMsg = msgId;
  reactionPopup.classList.add("open");

  // Position popup above the anchor button
  const rect = anchorEl.getBoundingClientRect();
  reactionPopup.style.top  = (rect.top - reactionPopup.offsetHeight - 8) + "px";
  reactionPopup.style.left = Math.max(8, rect.left - 20) + "px";

  // Reposition after popup renders (first frame the height is known)
  requestAnimationFrame(() => {
    const h = reactionPopup.offsetHeight;
    reactionPopup.style.top  = (rect.top - h - 8) + "px";
  });
}

function closeReactionPicker() {
  reactionPopup.classList.remove("open");
  reactionPickerMsg = null;
}

// Wire up each emoji button inside the shared picker
document.querySelectorAll(".rpick-emoji").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!reactionPickerMsg) return;
    socket.emit("react", { msgId: reactionPickerMsg, emoji: btn.dataset.emoji });
    closeReactionPicker();
  });
});

// ════════════════════════════════════════════════════════════
//  TYPING INDICATOR
// ════════════════════════════════════════════════════════════
msgInput.addEventListener("input", () => {
  if (!isTyping) { isTyping = true; socket.emit("typing"); }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(handleStopTyping, 2000);
});

function handleStopTyping() {
  if (isTyping) { isTyping = false; socket.emit("stopTyping"); clearTimeout(typingTimeout); }
}

// ════════════════════════════════════════════════════════════
//  SOCKET EVENTS — INCOMING
// ════════════════════════════════════════════════════════════

socket.on("message", (data) => {
  if (data.type === "system") {
    renderSystemMessage(data);
  } else {
    renderChatMessage(data);
    // Feature 3: show notification bubble if tab is hidden
    if (tabHidden && data.username !== currentUsername) {
      showNotifBubble(data.username, data.text);
    }
  }
  scrollToBottom();
});

socket.on("roomUsers", ({ users }) => renderUserList(users));

// ── Reaction update from server ───────────────────────────
socket.on("reactionUpdate", ({ msgId, reactions }) => {
  updateReactionPills(msgId, reactions);
});

// ── Typing ────────────────────────────────────────────────
let typingHideTimer = null;
socket.on("typing", ({ username }) => {
  typingText.textContent = `${username} is typing…`;
  typingIndicator.classList.add("visible");
  clearTimeout(typingHideTimer);
  typingHideTimer = setTimeout(() => typingIndicator.classList.remove("visible"), 3000);
});
socket.on("stopTyping", () => {
  clearTimeout(typingHideTimer);
  typingIndicator.classList.remove("visible");
});

socket.on("errorMsg", ({ message }) => alert("Error: " + message));

// ════════════════════════════════════════════════════════════
//  RENDER HELPERS
// ════════════════════════════════════════════════════════════

function renderChatMessage(data) {
  const isOwn = data.senderId === socket.id;

  const wrapper = document.createElement("div");
  wrapper.className = `msg-wrapper ${isOwn ? "own" : "other"}`;
  wrapper.dataset.msgId = data.id;   // used for reply jump & reactions

  // Avatar
  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = data.username.charAt(0);

  // Body container
  const body = document.createElement("div");
  body.className = "msg-body";

  // Meta (name + time)
  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.innerHTML = `
    <span class="msg-username">${escapeHTML(isOwn ? "You" : data.username)}</span>
    <span class="msg-time">${data.timestamp}</span>
  `;

  // Bubble
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  // ── If this message is a reply, show the quoted original ──
  if (data.replyTo) {
    const quote = document.createElement("div");
    quote.className = "msg-reply-quote";
    quote.innerHTML = `
      <span class="msg-reply-quote-name">↩ ${escapeHTML(data.replyTo.username)}</span>
      <span class="msg-reply-quote-text">${escapeHTML(data.replyTo.text)}</span>
    `;
    // Click quote → scroll to original message
    quote.addEventListener("click", () => jumpToMessage(data.replyTo.id));
    bubble.appendChild(quote);
  }

  // Message text
  const textNode = document.createTextNode(data.text);
  bubble.appendChild(textNode);

  // ── Action bar (Reply + React buttons) ───────────────────
  const actions = document.createElement("div");
  actions.className = "msg-actions";

  // Reply button
  const replyBtn = document.createElement("button");
  replyBtn.className = "msg-action-btn";
  replyBtn.innerHTML = "↩ Reply";
  replyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startReply(data.id, data.username, data.text);
  });

  // React button
  const reactBtn = document.createElement("button");
  reactBtn.className = "msg-action-btn";
  reactBtn.innerHTML = "😊 React";
  reactBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openReactionPicker(data.id, reactBtn);
  });

  actions.appendChild(replyBtn);
  actions.appendChild(reactBtn);

  // ── Reaction pills container ──────────────────────────────
  const reactionsEl = document.createElement("div");
  reactionsEl.className = "msg-reactions";
  reactionsEl.id = `reactions-${data.id}`;

  // Render initial reactions (if any — shouldn't be on new msgs but good practice)
  if (data.reactions && Object.keys(data.reactions).length > 0) {
    renderPills(reactionsEl, data.reactions);
  }

  body.appendChild(meta);
  body.appendChild(bubble);
  body.appendChild(reactionsEl);

  wrapper.appendChild(actions); // action bar floats above
  wrapper.appendChild(avatar);
  wrapper.appendChild(body);

  messagesEl.appendChild(wrapper);
}

function renderSystemMessage(data) {
  const el = document.createElement("div");
  el.className = "msg-system";
  el.textContent = data.text;
  messagesEl.appendChild(el);
}

function renderUserList(users) {
  userListEl.innerHTML = "";
  userCountEl.textContent = users.length;
  users.forEach(({ username }) => {
    const li = document.createElement("li");
    li.textContent = username;
    if (username === currentUsername) { li.classList.add("is-you"); li.textContent += " (you)"; }
    userListEl.appendChild(li);
  });
}

// ── Reaction Pills ────────────────────────────────────────

/**
 * Re-render the reaction pills for a message whenever a reactionUpdate arrives.
 */
function updateReactionPills(msgId, reactions) {
  const container = document.getElementById(`reactions-${msgId}`);
  if (!container) return;
  container.innerHTML = "";
  renderPills(container, reactions);
}

function renderPills(container, reactions) {
  Object.entries(reactions).forEach(([emoji, usernames]) => {
    if (usernames.length === 0) return;

    const pill = document.createElement("button");
    pill.className = "reaction-pill";
    const iMine = usernames.includes(currentUsername);
    if (iMine) pill.classList.add("reacted-by-me");

    pill.title = usernames.join(", ");
    pill.innerHTML = `${emoji} <span class="pill-count">${usernames.length}</span>`;

    // Clicking a pill re-sends the react event (server toggles it)
    const msgId = container.id.replace("reactions-", "");
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      socket.emit("react", { msgId, emoji });
    });

    container.appendChild(pill);
  });
}

// ════════════════════════════════════════════════════════════
//  FEATURE 3 — EYE-CATCHER NOTIFICATION BUBBLE
// ════════════════════════════════════════════════════════════

// Track whether the browser tab is hidden
document.addEventListener("visibilitychange", () => {
  tabHidden = document.hidden;
  // When user comes back, hide the bubble
  if (!tabHidden) hideBubble();
});

/**
 * Show the floating animated notification bubble.
 * Auto-hides after 5 seconds.
 */
function showNotifBubble(username, text) {
  clearTimeout(notifHideTimer);

  notifPreview.textContent = `${username}: ${text}`;
  notifBubble.style.display = "flex";
  notifBubble.classList.remove("hiding");

  // Also flash the page title
  flashTabTitle(`💬 ${username}: ${text.slice(0, 30)}…`);

  // Auto-dismiss after 5 seconds
  notifHideTimer = setTimeout(hideBubble, 5000);
}

function hideBubble() {
  notifBubble.classList.add("hiding");
  setTimeout(() => {
    notifBubble.style.display = "none";
    notifBubble.classList.remove("hiding");
  }, 300);
}

// Clicking the bubble or close button hides it
notifBubble.addEventListener("click", () => { hideBubble(); msgInput.focus(); });
notifClose.addEventListener("click", (e) => { e.stopPropagation(); hideBubble(); });

// ── Tab title flash ───────────────────────────────────────
let origTitle   = document.title;
let titleFlipTimer = null;

function flashTabTitle(msg) {
  clearInterval(titleFlipTimer);
  let show = true;
  titleFlipTimer = setInterval(() => {
    document.title = show ? msg : origTitle;
    show = !show;
  }, 1200);

  // Stop flashing when user returns to tab
  document.addEventListener("visibilitychange", function stopFlash() {
    if (!document.hidden) {
      clearInterval(titleFlipTimer);
      document.title = origTitle;
      document.removeEventListener("visibilitychange", stopFlash);
    }
  });
}

// ── Utilities ─────────────────────────────────────────────

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
