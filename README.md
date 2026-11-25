# Video Recorder — Live Location Tracker (MERN + Expo + Socket.IO)

Single-repository full-stack setup containing the Express + MongoDB + Socket.IO server, the React + MUI + Leaflet web dashboard, and the Expo React Native background location tracker (`Video Recorder`).

## Structure

```text
video-recorder/
├── package.json        # Root scripts (concurrently)
├── server/             # Express + Mongoose + JWT + Socket.IO backend
│   ├── .env.example
│   └── src/
│       ├── config/db.js
│       ├── middleware/auth.js
│       ├── models/Location.js
│       ├── routes/
│       │   ├── auth.js
│       │   └── location.js
│       ├── services/locationService.js
│       ├── socket/index.js
│       └── index.js
├── client/             # React + Vite + MUI + Leaflet web dashboard
│   ├── .env.example
│   └── src/
│       ├── components/
│       │   ├── LiveLocationCard.jsx
│       │   ├── LiveMap.jsx
│       │   └── LoginForm.jsx
│       ├── services/
│       │   ├── api.js
│       │   └── socket.js
│       ├── theme.js
│       ├── App.jsx
│       └── main.jsx
└── mobile/             # Expo React Native app ("Video Recorder")
    ├── .env.example
    ├── app.json
    ├── assets/video-rec.png
    └── src/
        ├── config/server.js
        ├── services/
        │   ├── api.js
        │   ├── socket.js
        │   └── storage.js
        └── tasks/locationTask.js
```

## Getting Started

1. **Install dependencies** (from the project root):
   ```bash
   npm run install:all
   ```

2. **Configure environment variables** (copy `.env.example` to `.env` in `server/`, `client/`, and `mobile/`):
   - `server/.env`: `PORT`, `MONGO_URI`, `CLIENT_URL`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `client/.env`: `VITE_API_URL`, `VITE_SOCKET_URL`
   - `mobile/.env`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AUTH_USERNAME`, `EXPO_PUBLIC_AUTH_PASSWORD`

3. **Run the server and web dashboard**:
   ```bash
   npm run dev
   ```
   - Web dashboard: `http://localhost:5173`
   - Backend health check: `http://localhost:5000/api/health`

4. **Run the Expo mobile app (`mobile/`)**:
   ```bash
   npm run mobile
   ```
