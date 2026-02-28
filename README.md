# Chat Backend

Node.js + Express + PostgreSQL + Prisma + Socket.io

---

## 📁 Project Structure

```
chat_backend/
├── src/
│   ├── index.js                     # Entry point — Express + Socket.io server
│   ├── controllers/
│   │   ├── auth.controller.js       # Anonymous login / auto-register
│   │   ├── users.controller.js      # User list
│   │   ├── groups.controller.js     # Group CRUD + join/leave
│   │   └── messages.controller.js   # DM + group message history
│   ├── middleware/
│   │   └── auth.js                  # JWT Bearer token validator
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── groups.routes.js
│   │   └── messages.routes.js
│   └── services/
│       ├── prisma.js                # Prisma singleton
│       ├── jwt.js                   # sign / verify helpers
│       └── socket.js                # Socket.io real-time engine
├── prisma/
│   ├── schema.prisma                # DB schema
│   └── seed.js                      # Demo data
├── .env.example
└── package.json
```

---

## ⚙️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/chatapp"
JWT_SECRET="your-super-secret-key"
PORT=3000
```

### 3. Create the database

```bash
# In psql:
CREATE DATABASE chatapp;
```

### 4. Run migrations

```bash
# First time or after schema changes:
npx prisma migrate dev --name init

# Or just push schema without migration history:
npx prisma db push
```

### 5. (Optional) Seed demo data

```bash
node prisma/seed.js
# Creates: alice, bob, charlie (password: password123) + "General" group
```

### 6. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## 🔌 REST API

All protected routes require header:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ token, user }` |

Auto-registers if username doesn't exist. Returns 401 if password is wrong.

---

### Users — 🔒 JWT required

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/users` | `User[]` (all users) |
| GET | `/users/:id` | `User` |

---

### Groups — 🔒 JWT required

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/groups` | — | My groups |
| GET | `/groups/all` | — | All groups |
| GET | `/groups/:id` | — | Single group |
| POST | `/groups` | `{ name }` | Created group |
| POST | `/groups/:id/join` | — | Updated group |
| DELETE | `/groups/:id/leave` | — | `{ message }` |

---

### Messages — 🔒 JWT required

| Method | Endpoint | Query | Response |
|--------|----------|-------|----------|
| GET | `/messages/dm/:otherUserId` | `page`, `limit` | `Message[]` |
| POST | `/messages/dm` | — | Created message |
| GET | `/messages/group/:groupId` | `page`, `limit` | `Message[]` |
| POST | `/messages/group` | — | Created message |

POST `/messages/dm` body: `{ receiverId, content }`
POST `/messages/group` body: `{ groupId, content }`

---

## 🔌 Socket.io

### Connection

```javascript
// Flutter / JS client
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  auth: { token: '<jwt>' },
  extraHeaders: { Authorization: 'Bearer <jwt>' }
});
```

### Client → Server events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ room }` | Join a chat room |
| `leave_room` | `{ room }` | Leave a chat room |
| `send_message` | see below | Send DM or group message |
| `typing` | `{ room }` | Notify others you're typing |
| `stop_typing` | `{ room }` | Notify others you stopped |

**`send_message` payload — DM:**
```json
{
  "type": "dm",
  "receiverId": "user-uuid",
  "content": "Hello!",
  "room": "dm_<smallerId>_<largerId>"
}
```

**`send_message` payload — Group:**
```json
{
  "type": "group",
  "groupId": "group-uuid",
  "content": "Hey everyone!",
  "room": "group_<groupId>"
}
```

### Server → Client events

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `Message` | New message received |
| `typing` | `{ userId, username, room }` | Peer is typing |
| `stop_typing` | `{ userId, username, room }` | Peer stopped typing |
| `error` | `{ message }` | Error from server |

### Room naming convention

```
DM:    dm_<lowerUserId>_<higherUserId>   (IDs sorted to ensure uniqueness)
Group: group_<groupId>
```

---

## 📦 Data Models

```
User        { id, username, password, createdAt, updatedAt }
Group       { id, name, createdById, createdAt, updatedAt }
GroupMember { id, userId, groupId, joinedAt }
Message     { id, content, senderId, receiverId?, groupId?, createdAt }
```

---

## 🛡️ Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWTs signed with HS256, configurable expiry (default 7d)
- Socket.io connections authenticated via JWT middleware before any event fires
- Group message membership verified before saving
- Never returns `password` field in any response
