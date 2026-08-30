# Syntara

**Syntara** is a real-time, privacy-first virtual study and collaboration platform designed for students, developers, and remote teams. It enables instant, ephemeral study groups and chat rooms with zero account friction, WebRTC peer-to-peer file sharing, synchronized collaborative tools (whiteboard, rich-text study notes, multi-language code scratchpad, Pomodoro sprint timers, and interactive group quizzes), and low-latency messaging.

---

## Key Features

- **Instant Ephemeral Rooms**: Create or join study spaces with a 6-character room code (`STU-XXXX` / `CHT-XXXX`). No sign-up required.
- **Dedicated Modes**:
  - **Chat Room Mode**: Streamlined two-column real-time messaging workspace with 12-hour local clock timestamps, smart message grouping, live presence indicators, and session statistics.
  - **Study Room Mode**: Three-column collaborative study hub with synchronized focus tools.
- **Direct P2P File Sharing**: WebRTC DataChannel-powered zero-retention file transfer directly between peers, complete with drag & drop, file type detection, and inline image/document previews.
- **Synchronized Study Tools**:
  - **Collaborative Whiteboard**: Real-time canvas with smooth pen, eraser, color palette, stroke sizing, and global clear/undo sync.
  - **Live Study Notes**: Synchronized rich-text editor with markdown support, headings, lists, code blocks, and active editor presence.
  - **Multi-Language Code Scratchpad**: Real-time syntax-highlighted code editor supporting JavaScript, Python, C++, Java, HTML, and CSS.
  - **Focus Sprint Timer**: Synchronized Pomodoro timer with configurable sprints and break sessions.
  - **Interactive Group Quizzes**: Create multiple-choice quizzes with live timers, synchronized question progression, and instant leaderboards.
- **Syntara Design System**: Custom theme engine supporting dark and warm light modes with high-contrast UI, custom typography, and responsive zoom scaling (67%–125%).

---

## Tech Stack

### Frontend (`client/`)
- **Core**: React 19, React Router v7
- **Build Tool**: Vite 8
- **Real-Time Client**: Socket.IO Client v4
- **P2P File Transfer**: Native WebRTC `RTCPeerConnection` & `RTCDataChannel`
- **Rich Text Editor**: TipTap v3 (ProseMirror core)
- **Virtualization**: TanStack Virtual v3
- **Icons**: Lucide React
- **Styling**: Vanilla CSS with custom HSL token architecture and glassmorphic elevations

### Backend (`server/`)
- **Runtime**: Node.js
- **Framework**: Express v5
- **WebSockets / Signaling**: Socket.IO v4
- **Validation**: Zod
- **File Uploads (Fallback)**: Multer
- **State Management**: In-memory ephemeral `RoomStore` with automatic inactive room sweeps and rate limiting

---

## Architecture

```text
+--------------------------------------------------------+
¦                   Client (Browser)                     ¦
¦  - React 19 UI + Theme System                          ¦
¦  - useRoom (Socket state orchestrator)                 ¦
¦  - useWebRTCFileTransfer (P2P DataChannel mesh)        ¦
+--------------------------------------------?-----------+
             ¦                               ¦
    WebSocket Signaling             P2P DataChannel (Mesh)
    & Room State Sync               Direct File Transfers
             ¦                               ¦
+------------?-------------------------------------------+
¦              Syntara Server (Node.js/Express)          ¦
¦  - Socket.IO Real-time Gateways                        ¦
¦  - In-Memory RoomStore & Session Lifecycle Manager     ¦
¦  - Rate Limiting & Input Sanitization (Zod)            ¦
+--------------------------------------------------------+
```

---

## Project Structure

```text
Syntara/
+-- client/                     # Vite + React Frontend
¦   +-- src/
¦   ¦   +-- components/         # Reusable UI primitives (Avatar, Button, Modal, etc.)
¦   ¦   +-- features/
¦   ¦   ¦   +-- landing/        # Marketing landing page components & previews
¦   ¦   ¦   +-- room-entry/     # Room creation and joining modal dialogs
¦   ¦   ¦   +-- room/           # Study & Chat room workspaces
¦   ¦   ¦       +-- activity/   # Real-time room activity feed
¦   ¦   ¦       +-- chat/       # Chat timeline, composer, & file-sharing modal
¦   ¦   ¦       +-- code/       # Synchronized code scratchpad
¦   ¦   ¦       +-- focus/      # Pomodoro focus sprint timer
¦   ¦   ¦       +-- goals/      # Shared session goals checklist
¦   ¦   ¦       +-- notes/      # Collaborative TipTap study notes
¦   ¦   ¦       +-- participants/# Participant list, quick actions, & session stats
¦   ¦   ¦       +-- quiz/       # Live interactive group quiz
¦   ¦   ¦       +-- whiteboard/ # HTML5 canvas synchronized whiteboard
¦   ¦   +-- hooks/              # Custom React hooks (useRoom, useWebRTCFileTransfer, etc.)
¦   ¦   +-- lib/                # Socket.io client, formatters, and utilities
¦   ¦   +-- pages/              # LandingPage, RoomPage, NotFoundPage
¦   ¦   +-- styles/             # Global CSS tokens, resets, and variables
¦   +-- .env.example
¦   +-- index.html
¦   +-- package.json
¦   +-- vite.config.js
+-- server/                     # Node.js + Express Backend
¦   +-- src/
¦   ¦   +-- rooms/              # Ephemeral RoomStore & cleanup routines
¦   ¦   +-- services/           # Zod schema validation & room utilities
¦   ¦   +-- socket/             # Socket.IO event handlers (chat, whiteboard, notes, etc.)
¦   ¦   +-- app.js              # Express application setup & middleware
¦   ¦   +-- server.js           # HTTP & Socket.IO server entry point
¦   +-- .env.example
¦   +-- package.json
+-- .gitignore
+-- README.md
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/AyushRaj2506/Syntara.git
cd Syntara
```

### 2. Configure Environment Variables

**Client Configuration**:
```bash
cp client/.env.example client/.env
```
Ensure `VITE_SERVER_URL` points to your backend (default `http://localhost:4000`).

**Server Configuration**:
```bash
cp server/.env.example server/.env
```
Ensure `CLIENT_ORIGIN` points to your frontend (default `http://localhost:5173`).

### 3. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Run in Development Mode

**Terminal 1 (Backend Server)**:
```bash
cd server
npm run dev
# Server runs at http://localhost:4000
```

**Terminal 2 (Frontend Client)**:
```bash
cd client
npm run dev
# Client runs at http://localhost:5173
```

---

## Environment Variables Reference

### Client (`client/.env`)
| Variable | Description | Required | Default |
|---|---|:---:|---|
| `VITE_SERVER_URL` | Base URL for Socket.IO signaling and API endpoints | Yes | `http://localhost:4000` |

### Server (`server/.env`)
| Variable | Description | Required | Default |
|---|---|:---:|---|
| `PORT` | Port for the HTTP/WebSocket server | No | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin for frontend client requests | Yes | `http://localhost:5173` |
| `ROOM_CLEANUP_INTERVAL_MS` | Sweep interval for removing inactive rooms | No | `60000` |
| `ROOM_EMPTY_GRACE_MS` | Grace period before cleaning up empty rooms | No | `120000` |
| `MAX_ROOMS_PER_IP_PER_HOUR` | Rate limiting for room creation per IP | No | `10` |

---

## How It Works

1. **Room Creation & Entry**:
   - The host chooses a mode (**Study Room** or **Chat Room**) and creates an ephemeral session.
   - The server assigns a unique code and initializes an in-memory session.
   - Participants join by navigating directly to `/room/CODE` or entering the code on the landing page.
2. **Real-Time Synchronization**:
   - All room states (participants, whiteboard strokes, study notes, focus timer, chat messages) are synchronized in real-time via Socket.IO events.
   - Reconnections preserve session state and participant identity via temporary session tokens.
3. **P2P File Transfer (WebRTC)**:
   - When a peer shares a file, the server coordinates WebRTC signaling (SDP offer/answer and ICE candidate exchange).
   - Once a secure `RTCDataChannel` is established, the file is sliced into binary chunks and sent directly peer-to-peer.
   - Files are never stored on any central server, ensuring zero data retention.

---

## Production Deployment

### 1. Build the Frontend
```bash
cd client
npm run build
```
The optimized production bundle is generated in `client/dist/`. You can deploy this directory to **Vercel**, **Cloudflare Pages**, **Netlify**, or **AWS S3 + CloudFront**.

### 2. Deploy the Backend
Deploy the `server/` directory to **Render**, **Railway**, **Fly.io**, or an **Ubuntu VPS**:
```bash
cd server
npm start
```

> [!IMPORTANT]
> **HTTPS / WSS Requirement for WebRTC**:
> Browsers restrict WebRTC peer connections and microphone/media capabilities on non-secure origins. Ensure both your frontend and backend are served over **HTTPS** and **WSS** in production environments.

---

## Troubleshooting

- **WebRTC File Transfer Not Connecting**: Ensure your network allows UDP traffic and that both clients are served over HTTPS in production. In restricted corporate NATs/firewalls, a TURN server relay may be configured in `client/src/hooks/useWebRTCFileTransfer.js`.
- **CORS / Socket Connection Error**: Ensure `CLIENT_ORIGIN` in `server/.env` exactly matches your frontend domain (including protocol and port, without a trailing slash).

---

## License

This project is licensed under the ISC License.
