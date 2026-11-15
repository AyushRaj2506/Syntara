# Reliability and security changes

The repair adds authenticated temporary uploads, canonical storage paths and quotas; room reconnection grace; acknowledged chat delivery and retry; revision-checked notes and code; committed whiteboard echoes; focus pause/resume/reset; safe quiz projections and completion; one responsive workspace; and verified peer file delivery with server fallback.

## Run the checks

Install packages in both `client` and `server` using `npm ci`. Use Node 22.12 or newer.

- Backend: `cd server` then `npm test`.
- Frontend: `cd client` then `npm run build`, `npm run lint`, and `npm run test:e2e`.
- Browser tests require installed Google Chrome. They launch isolated local servers on ports 4011 and 5175.
- Dependency checks: run `npm audit` in both directories.

## Collaboration behavior

- Unexpected disconnects preserve the participant identity for `ROOM_EMPTY_GRACE_MS` (default two minutes). Explicit Leave removes the participant immediately.
- Notes/code use optimistic revision checks. They do not automatically merge character-level concurrent edits. Conflicts preserve the local draft and show the latest server version for comparison. Users can discard their draft or explicitly save it over the latest version.
- Unsaved drafts remain in browser session storage until saved or discarded. This is disclosed in the documentation and sync status.
- Direct files go to the connected recipients present at send time. They are not restored by a browser refresh. Receipt failures or missing channels use temporary server storage for the room.
- Temporary uploads require `X-Room-Code` and an Authorization bearer participant token. Random file links are private download capabilities valid only while the room is active.
- Uploads are limited to 250 MB per file, 500 MB per room, and 1 GB total. An in-flight upload reserves 250 MB until completion or abort. Goals are capped at 100 and whiteboard histories at 2000 strokes.
- Room expiry/deletion removes uploads and cancels focus/quiz timers. Startup removes orphaned upload directories left by a previous process.

## Deployment

Deploy frontend and backend together: their collaboration and upload contracts changed. The Render blueprint uses `npm ci` for reproducible builds. Configure `CLIENT_ORIGIN` and `VITE_SERVER_URL` for the corresponding deployed services.

The server keeps rooms in memory. Deploy a single backend instance; restarts end rooms. Horizontal scaling requires a shared room store and socket adapter and is outside this repair.

Python needs an initial Pyodide runtime download and then executes in a browser worker. C++ execution depends on Wandbox availability. Automated tests do not submit code to that third-party service.

The release includes 8 backend regression tests, 5 browser scenarios, and a GitHub Actions workflow. The backend health endpoint reports RENDER_GIT_COMMIT so deployments can be checked against the GitHub commit.
