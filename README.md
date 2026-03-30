# 🌊 ChatWave — Real-Time Chat Application

![ChatWave Banner](https://img.shields.io/badge/ChatWave-Real--Time%20Chat-6c63ff?style=for-the-badge&logo=socket.io)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io)

A full-featured real-time chat application with **end-to-end encryption**, **group chats**, **file sharing**, and **online presence** — built with Node.js, Socket.io, and MongoDB.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **JWT Authentication** | Secure register & login with hashed passwords |
| 💬 **One-to-One Chat** | Real-time private messaging via Socket.io |
| 👥 **Group Chat** | Create groups, add/remove members |
| 🔒 **Message Encryption** | AES-256-CBC end-to-end encryption |
| 📎 **File Sharing** | Send images and files (up to 10MB) |
| 🟢 **Online Status** | Real-time online/offline presence |
| ✍️ **Typing Indicators** | See when someone is typing |
| ✅ **Read Receipts** | Know when your messages are read |

---

## 🛠️ Tech Stack

**Backend**
- **Node.js** + **Express.js** — REST API
- **Socket.io** — Real-time bidirectional communication
- **MongoDB** + **Mongoose** — Database & ODM
- **bcrypt** — Password hashing
- **JWT** — Authentication tokens
- **Multer** — File upload handling
- **AES-256-CBC** — Message encryption

**Frontend**
- Vanilla **HTML/CSS/JavaScript**
- Socket.io client
- Fully responsive UI

---

## 📁 Project Structure

```
chatapp/
├── app.js                    # Entry point
├── .env                      # Environment variables
├── frontend/
│   └── index.html            # Frontend UI
├── models/
│   ├── user.model.js
│   ├── message.model.js
│   └── group.model.js
├── controllers/
│   ├── auth.controller.js
│   ├── message.controller.js
│   └── group.controller.js
├── routes/
│   ├── auth.routes.js
│   ├── message.routes.js
│   └── group.routes.js
├── middleware/
│   ├── auth.middleware.js
│   └── upload.middleware.js
├── socket/
│   └── socket.js
└── utils/
    └── encryption.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/chatwave.git
cd chatwave

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your values

# Start the server
npm run dev
```

### Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_super_secret_key
ENCRYPTION_KEY=12345678901234567890123456789012
```

---

## 📡 API Reference

### Auth
```
POST   /api/auth/register     Register new user
POST   /api/auth/login        Login
GET    /api/auth/me           Get profile
GET    /api/auth/users        Get all users
PUT    /api/auth/avatar       Upload avatar
```

### Messages
```
GET    /api/messages/conversations   Get all conversations
GET    /api/messages/:userId         Get messages with user
POST   /api/messages/send            Send message or file
DELETE /api/messages/:id             Delete message
```

### Groups
```
POST   /api/groups                          Create group
GET    /api/groups                          Get my groups
GET    /api/groups/:id                      Get group
POST   /api/groups/:id/members              Add member
DELETE /api/groups/:id/members/:userId      Remove member
POST   /api/groups/:id/messages             Send group message
GET    /api/groups/:id/messages             Get group messages
```

### Socket.io Events

**Emit (Client → Server)**
```js
socket.emit('sendMessage',      { receiverId, content })
socket.emit('sendGroupMessage', { groupId, content })
socket.emit('joinGroups',       [groupId1, groupId2])
socket.emit('typing',           { receiverId?, groupId? })
socket.emit('stopTyping',       { receiverId?, groupId? })
socket.emit('markRead',         { senderId })
```

**Listen (Server → Client)**
```js
socket.on('newMessage',      (msg) => {})
socket.on('newGroupMessage', (msg) => {})
socket.on('typing',          ({ name }) => {})
socket.on('userOnline',      ({ userId }) => {})
socket.on('userOffline',     ({ userId }) => {})
socket.on('messagesRead',    ({ by }) => {})
```

---

## 🖼️ Screenshots

> Open `frontend/index.html` in your browser after starting the server.

---

## 📄 License
