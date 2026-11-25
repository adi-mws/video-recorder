# MERN + MUI + Socket.IO Starter

A clean MERN stack setup with:
- **MongoDB & Mongoose** (`server/src/config/db.js`, `server/src/models/Message.js`)
- **Express** (`server/src/index.js`, `server/src/routes/messages.js`)
- **React + Vite + Material UI (MUI)** (`client/src/App.jsx`, `client/src/theme.js`)
- **Socket.IO** (`server/src/socket/index.js`, `client/src/services/socket.js`)

## Structure

```text
video-recorder/
├── package.json        # Root scripts (concurrently)
├── server/             # Express + Mongoose + Socket.IO backend
│   ├── .env
│   └── src/
│       ├── config/db.js
│       ├── models/Message.js
│       ├── routes/messages.js
│       ├── socket/index.js
│       └── index.js
└── client/             # React + Vite + MUI + Socket.IO client
    ├── .env
    └── src/
        ├── services/
        │   ├── api.js
        │   └── socket.js
        ├── theme.js
        ├── App.jsx
        └── main.jsx
```

## Getting Started

1. **Install dependencies** (from the project root):
   ```bash
   npm run install:all
   ```

2. **Configure environment variables** (already pre-populated with defaults):
   - `server/.env`:
     - `PORT=5000`
     - `MONGO_URI=mongodb://127.0.0.1:27017/video_recorder_mern`
     - `CLIENT_URL=http://localhost:5173`
     - `AUTH_USERNAME=admin`
     - `AUTH_PASSWORD=changeme123`
     - `JWT_SECRET=dev-local-jwt-secret-change-in-production`
     - `JWT_EXPIRES_IN=7d`
   - `client/.env`: `VITE_API_URL=http://localhost:5000`, `VITE_SOCKET_URL=http://localhost:5000`

3. **Run both client and server**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000/api/health`

4. **Run the Expo native app (`mobile/`)**:
   ```bash
   npm run mobile
   ```
   - Press `a` for Android emulator (`http://10.0.2.2:5000`), `i` for iOS simulator (`http://localhost:5000`), or scan the QR code with Expo Go using your computer's LAN IP (e.g. `http://192.168.x.x:5000`).

