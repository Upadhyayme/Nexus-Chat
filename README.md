# ⬡ Nexus Chat

> A real-time chat application built with Node.js, Express, and Socket.io

![License](https://img.shields.io/badge/license-MIT-cyan)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Socket.io](https://img.shields.io/badge/socket.io-4.7.2-blue)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey)

---

## 📸 Overview

Nexus Chat is a sleek, dark-themed real-time chat application where multiple users can join named rooms and communicate instantly — no page refresh needed. Built with a terminal-messenger aesthetic using pure HTML, CSS, and JavaScript on the frontend, powered by Socket.io WebSockets on the backend.

---

## ✨ Features

### Core
- 🔌 **Real-time messaging** — Messages appear instantly using WebSockets
- 🏠 **Multiple chat rooms** — Users join by room name; messages stay isolated per room
- 👤 **Username system** — Every message shows sender name and timestamp
- 📢 **Join / Leave notifications** — Room is notified when someone arrives or leaves
- 👥 **Live user list** — Sidebar shows who's currently online in the room

### Advanced
- ↩️ **WhatsApp-style replies** — Reply to a specific message with quoted preview; click quote to jump to original
- 😊 **Quick emoji reactions** — React to any message with 8 emojis (👍 ❤️ 😂 😮 😢 🔥 🎉 💯); reactions sync live across all users
- 🔔 **Eye-catcher notification bubble** — Animated floating alert appears when a new message arrives on a hidden tab, with tab title flashing
- ⌨️ **Typing indicator** — Shows "User is typing…" with animated dots in real time
- 📱 **Responsive design** — Works on mobile with collapsible sidebar

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Real-time | Socket.io 4.x |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Fonts | Syne (display) + JetBrains Mono (body) |

---

## 📁 Project Structure

```
Nexus-chat/
├── public/
│   ├── index.html      # UI — Join screen + Chat screen
│   ├── style.css       # Dark terminal-messenger theme
│   └── script.js       # Socket.io client + all UI logic
├── server.js           # Express + Socket.io backend
├── package.json        # Dependencies
├── .gitignore          # Excludes node_modules, .env, logs
├── LICENSE             # MIT License
└── README.md           # You are here
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- npm (comes with Node.js)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Upadhyayme/Nexus-Chat.git
cd Nexus-Chat
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the server**
```bash
node server.js
```

**4. Open in browser**
```
http://localhost:3000
```

---

## 💬 How to Use

1. Enter your **username** (e.g. `ShadowFox`)
2. Enter a **room name** (e.g. `general`)
3. Click **Join Room**
4. Start chatting in real time!

> 💡 Open two browser tabs with the same room name to test live messaging between users.

---

## 🔌 Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `joinRoom` | `{ username, room }` | User joins a named room |
| `chatMessage` | `{ text, replyTo? }` | Send a message (with optional reply) |
| `react` | `{ msgId, emoji }` | Toggle emoji reaction on a message |
| `typing` | — | User started typing |
| `stopTyping` | — | User stopped typing |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `message` | `{ id, type, username, text, timestamp, reactions, replyTo }` | New message broadcast |
| `roomUsers` | `{ room, users[] }` | Updated list of users in room |
| `reactionUpdate` | `{ msgId, reactions }` | Updated reactions for a message |
| `typing` | `{ username }` | Someone is typing |
| `stopTyping` | — | Typing stopped |

---

## 🌐 Deployment

This app is deployed on **Railway**.

👉 **Live URL:** `https://your-app.up.railway.app`

### Deploy Your Own on Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → Sign in with GitHub
3. Click **New Project → Deploy from GitHub repo**
4. Select this repository
5. Set Start Command: `node server.js`
6. Go to **Settings → Networking → Generate Domain**
7. Your app is live! 🎉

---

## 🔒 Security Notes

- All user input is sanitised server-side (trimmed, length-limited)
- Frontend uses `textContent` (never `innerHTML`) for message rendering — XSS safe
- `.env` files are excluded via `.gitignore`
- `node_modules` is excluded from the repository

---

## 🗺️ Roadmap

- [ ] Persistent chat history with MongoDB
- [ ] Private direct messaging
- [ ] Image / file sharing
- [ ] User avatars
- [ ] Message search
- [ ] Dark / light theme toggle

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👩‍💻 Author

**Shreya** — [@Upadhyayme](https://github.com/Upadhyayme)

---

<div align="center">
  Made with ❤️ and Socket.io
  <br/>
  ⬡ <strong>NEXUS</strong> — Real-time · Rooms · Reactions · Replies
</div>
