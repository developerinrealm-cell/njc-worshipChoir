# Worship Presenter

A church lyrics display app — React SPA + Node.js backend with real-time sync via Socket.io.

## Features

- **Song library** — add, edit, and manage songs with English + Telugu lyrics per section
- **Setlists** — build ordered setlists for each service
- **Controller** — operator view to navigate songs and sections live
- **Display** — clean full-screen lyrics window for the projector / TV
- **Live sync** — controller and display stay in sync over WebSocket (any device on same Wi-Fi)
- **Persistent storage** — SQLite database, survives server restarts

---

## Quick start

### Requirements
- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
# From the project root
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

Or use the shortcut:
```bash
npm run install:all
```

### 2. Run the app

```bash
npm run dev
```

This starts both:
- **Node server** on `http://localhost:3001`
- **React app** on `http://localhost:5173`

### 3. Open the app

| URL | Purpose |
|-----|---------|
| `http://localhost:5173/library` | Song editor |
| `http://localhost:5173/setlists` | Setlist builder |
| `http://localhost:5173/controller` | Operator control panel |
| `http://localhost:5173/display` | Full-screen lyrics display |

### 4. Two-screen setup

1. Open `http://localhost:5173/controller` on your **laptop** (operator)
2. Open `http://localhost:5173/display` on your **projector / TV** (full screen with F11)
3. Both screens are live-synced — what you do in Controller instantly appears on Display

### 5. Multi-device (over Wi-Fi)

Replace `localhost` with your computer's local IP address (e.g. `192.168.1.10`):

```
http://192.168.1.10:5173/display   ← open on projector/TV
http://192.168.1.10:5173/controller ← open on your phone/tablet
```

Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

---

## Project structure

```
worship-presenter/
├── package.json           # Root — runs both server + client
├── server/
│   ├── index.js           # Express + Socket.io + SQLite
│   ├── package.json
│   └── worship.db         # Auto-created on first run
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── context/
        │   └── SocketContext.jsx   # Live sync state
        ├── hooks/
        │   ├── useSongs.js         # Songs API
        │   └── useSetlists.js      # Setlists API
        └── pages/
            ├── Library.jsx         # Song editor
            ├── Setlists.jsx        # Setlist builder
            ├── Controller.jsx      # Live presenter control
            └── Display.jsx         # Full-screen display
```

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/songs` | All songs with sections |
| POST | `/api/songs` | Create song |
| PUT | `/api/songs/:id` | Update song |
| DELETE | `/api/songs/:id` | Delete song |
| GET | `/api/setlists` | All setlists |
| POST | `/api/setlists` | Create setlist |
| PUT | `/api/setlists/:id` | Update setlist |
| DELETE | `/api/setlists/:id` | Delete setlist |

## Socket events

| Event | Direction | Payload |
|-------|-----------|---------|
| `presenter:update` | Client → Server | `{ songId, sectionIndex, lang, blank }` |
| `presenter:state` | Server → Client | Full presenter state |
| `songs:updated` | Server → Client | (triggers refetch) |
| `setlists:updated` | Server → Client | (triggers refetch) |
