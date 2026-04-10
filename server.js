// ============================================================
//  server.js — Nexus Chat Backend (v2)
//  NEW: Message replies, emoji reactions, unique message IDs
// ============================================================

const express = require("express");
const http    = require("http");
const path    = require("path");
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const PORT   = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// ── In-Memory Stores ─────────────────────────────────────────
const users    = {};   // socketId → { username, room }
const messages = {};   // room → [ ...messageObjects ]
                       // Keeps last 200 msgs per room for reaction sync

// ── Helpers ──────────────────────────────────────────────────
function getUsersInRoom(room) {
  return Object.values(users).filter((u) => u.room === room);
}

function getTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
}

// Generate a short unique message ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Get or initialise the message list for a room
function roomMessages(room) {
  if (!messages[room]) messages[room] = [];
  return messages[room];
}

// Find a stored message by id inside a room
function findMessage(room, msgId) {
  return roomMessages(room).find((m) => m.id === msgId) || null;
}

// ── Socket.io ────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // ── joinRoom ──────────────────────────────────────────────
  socket.on("joinRoom", ({ username, room }) => {
    if (!username || !room) {
      socket.emit("errorMsg", { message: "Username and room are required." });
      return;
    }

    const cleanName = username.trim().substring(0, 20);
    const cleanRoom = room.trim().toLowerCase().replace(/\s+/g, "-").substring(0, 30);

    users[socket.id] = { username: cleanName, room: cleanRoom };
    socket.join(cleanRoom);

    console.log(`👤 ${cleanName} joined #${cleanRoom}`);

    // Welcome message to the joiner
    socket.emit("message", {
      id: genId(), type: "system",
      text: `Welcome to #${cleanRoom}, ${cleanName}! 🎉`,
      timestamp: getTimestamp(),
    });

    // Notify others
    socket.to(cleanRoom).emit("message", {
      id: genId(), type: "system",
      text: `${cleanName} has joined the room.`,
      timestamp: getTimestamp(),
    });

    io.to(cleanRoom).emit("roomUsers", {
      room: cleanRoom,
      users: getUsersInRoom(cleanRoom),
    });
  });

  // ── chatMessage ───────────────────────────────────────────
  // Payload: { text, replyTo? }
  // replyTo: { id, username, text }  — populated when replying
  socket.on("chatMessage", ({ text, replyTo }) => {
    const user = users[socket.id];
    if (!user) return;

    const trimmed = text?.trim();
    if (!trimmed) return;

    const msgId = genId();

    const msgObj = {
      id:        msgId,
      type:      "chat",
      username:  user.username,
      text:      trimmed,
      timestamp: getTimestamp(),
      senderId:  socket.id,
      reactions: {},          // emoji → [username, ...]
      replyTo:   replyTo || null,
    };

    // Store message (cap at 200 per room)
    const list = roomMessages(user.room);
    list.push(msgObj);
    if (list.length > 200) list.shift();

    console.log(`💬 [${user.room}] ${user.username}: ${trimmed}`);

    io.to(user.room).emit("message", msgObj);
  });

  // ── react ─────────────────────────────────────────────────
  // Payload: { msgId, emoji }
  // Toggles the reaction — add if not present, remove if already reacted
  socket.on("react", ({ msgId, emoji }) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = findMessage(user.room, msgId);
    if (!msg) return;

    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const idx = msg.reactions[emoji].indexOf(user.username);
    if (idx === -1) {
      // Add reaction
      msg.reactions[emoji].push(user.username);
    } else {
      // Remove reaction (toggle off)
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }

    // Broadcast updated reactions to everyone in the room
    io.to(user.room).emit("reactionUpdate", {
      msgId,
      reactions: msg.reactions,
    });
  });

  // ── typing / stopTyping ───────────────────────────────────
  socket.on("typing", () => {
    const user = users[socket.id];
    if (!user) return;
    socket.to(user.room).emit("typing", { username: user.username });
  });

  socket.on("stopTyping", () => {
    const user = users[socket.id];
    if (!user) return;
    socket.to(user.room).emit("stopTyping");
  });

  // ── disconnect ────────────────────────────────────────────
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      console.log(`👋 ${user.username} left #${user.room}`);
      io.to(user.room).emit("message", {
        id: genId(), type: "system",
        text: `${user.username} has left the room.`,
        timestamp: getTimestamp(),
      });
      delete users[socket.id];
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Chat server running → http://localhost:${PORT}\n`);
});
