# GeoKZN Codex Guide

## Purpose

This file is a compact context guide for future Codex chats working on this project.
The goal is to let a new chat quickly understand the app, current decisions, and the most important files without the user having to repeat everything.

## Project Summary

- Project name: `GeoKZN`
- Domain: geo-based city messenger for Kazan
- Target platform: mobile only
- Main focus: Android and iPhone
- Web is not a product target
- Frontend stack: Expo / React Native / Expo Router / react-native-maps
- Backend stack: Node.js / Express / PostgreSQL / WebSocket

## High-Level Architecture

### Frontend

- Root app state lives in [app/_layout.tsx](/E:/Курсовая/TestApp/app/_layout.tsx)
- The app is effectively a screen-state app layered on top of Expo Router
- Major screens live in `components/`
- Theme context lives in [contexts/ThemeContext.tsx](/E:/Курсовая/TestApp/contexts/ThemeContext.tsx)
- API calls go through [lib/api.ts](/E:/Курсовая/TestApp/lib/api.ts)
- Realtime WebSocket goes through [lib/realtime.ts](/E:/Курсовая/TestApp/lib/realtime.ts)

### Backend

- Main API server: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)
- DB access: [backend/src/db.js](/E:/Курсовая/TestApp/backend/src/db.js)
- Auth helpers: [backend/src/auth.js](/E:/Курсовая/TestApp/backend/src/auth.js)
- Schema: [backend/schema.sql](/E:/Курсовая/TestApp/backend/schema.sql)
- Seed: [backend/seed.sql](/E:/Курсовая/TestApp/backend/seed.sql)

## Important Product Rules

- Mobile only. Do not optimize for web unless explicitly asked.
- The map must stay conceptually limited to Kazan.
- Guest users can view the map, but creating events requires login.
- The project is being prepared for diploma defense, so stability and predictable demo behavior matter more than fancy architecture.

## Current Frontend Structure

Key UI files:

- [components/MapScreen.tsx](/E:/Курсовая/TestApp/components/MapScreen.tsx): main map screen
- [components/LoginScreen.tsx](/E:/Курсовая/TestApp/components/LoginScreen.tsx): login / register / guest / server address config
- [components/CreateEventScreen.tsx](/E:/Курсовая/TestApp/components/CreateEventScreen.tsx): create and edit event form
- [components/EventDetailsScreen.tsx](/E:/Курсовая/TestApp/components/EventDetailsScreen.tsx): event card
- [components/ChatScreen.tsx](/E:/Курсовая/TestApp/components/ChatScreen.tsx): comments/chat
- [components/ProfileScreen.tsx](/E:/Курсовая/TestApp/components/ProfileScreen.tsx): profile and password change
- [components/AdminPanelScreen.tsx](/E:/Курсовая/TestApp/components/AdminPanelScreen.tsx): moderation and official events
- [components/LoadingScreen.tsx](/E:/Курсовая/TestApp/components/LoadingScreen.tsx): custom loading screen

Utility files:

- [lib/useBoundedMapRegion.ts](/E:/Курсовая/TestApp/lib/useBoundedMapRegion.ts): map region clamping and correction behavior
- [lib/mapRegion.ts](/E:/Курсовая/TestApp/lib/mapRegion.ts): region-change helper logic
- [lib/errorHints.ts](/E:/Курсовая/TestApp/lib/errorHints.ts): user-friendly API error text
- [constants/map.ts](/E:/Курсовая/TestApp/constants/map.ts): Kazan center and bounds
- [constants/limits.ts](/E:/Курсовая/TestApp/constants/limits.ts): UI validation limits

## Current Backend Behavior

- Auth endpoints exist for login and register
- Password change exists for logged-in user
- There is no full "forgot password by email" flow yet
- Events, comments, reports, moderation, blocking, and admin actions exist
- WebSocket is used for event/comment realtime refresh

Default local backend config:

- backend `.env` is usually:
  - `PORT=4000`
  - `DATABASE_URL=postgres://geomessenger_user:geomessenger_pass@localhost:5432/geomessenger`
  - `JWT_SECRET=change_me_dev_secret`

## Running Locally

### Backend

```powershell
cd "E:\Курсовая\TestApp\backend"
npm run dev
```

### Frontend in Expo Go / dev mode

```powershell
cd "E:\Курсовая\TestApp"
npm run start -- --offline
```

Notes:

- Backend must be running for full functionality
- Without backend the app still opens and shows local fallback demo events
- Guest map mode works without login

## APK / Build State

The project has already been prepared for Android build:

- [app.json](/E:/Курсовая/TestApp/app.json) added
- [eas.json](/E:/Курсовая/TestApp/eas.json) added
- [.easignore](/E:/Курсовая/TestApp/.easignore) added
- `eas-cli` is installed in `devDependencies`

Useful commands:

```powershell
cd "E:\Курсовая\TestApp"
npm run build:apk
```

And for production bundle:

```powershell
npm run build:android
```

## Runtime Server URL Switching

This was added specifically so the user does not need to rebuild the APK every time the backend IP changes.

Current behavior:

- Initial fallback URL is resolved in [lib/api.ts](/E:/Курсовая/TestApp/lib/api.ts)
- Saved custom server URL is stored with `AsyncStorage`
- Login screen exposes a small "server" settings block
- User can save a new URL like `http://192.168.0.10:4000`
- Realtime reconnect also follows the current runtime URL

Files involved:

- [lib/api.ts](/E:/Курсовая/TestApp/lib/api.ts)
- [lib/realtime.ts](/E:/Курсовая/TestApp/lib/realtime.ts)
- [components/LoginScreen.tsx](/E:/Курсовая/TestApp/components/LoginScreen.tsx)
- [app/_layout.tsx](/E:/Курсовая/TestApp/app/_layout.tsx)

## Map Behavior and Known Decisions

This project has had several iterations around `react-native-maps`.

Important current decisions:

- Do not use `setMapBoundaries`; it caused native crashes on iPhone / Expo Go
- Main map currently uses bounded-region logic from [lib/useBoundedMapRegion.ts](/E:/Курсовая/TestApp/lib/useBoundedMapRegion.ts)
- Guest-only freezing was partially mitigated by removing unnecessary guest long-press behavior on the map
- The create-event flow was changed to a fullscreen map picker, because an interactive map inside a scrollable form caused touch conflicts
- Fullscreen picker uses safe area handling for iPhone

If touching map logic again:

- Be careful with controlled `region`
- Be careful with aggressive correction loops after pan
- Be careful with nested `ScrollView` + `MapView`
- Be careful with custom marker performance on iOS

## Validation and UX Changes Already Done

- Required fields are highlighted in red
- Russian validation messages were added
- Event title max length is restricted to 30 characters
- Backend validation for title length was also added
- Loading screen was added instead of a plain white startup screen

## Important Demo / Defense Context

This project is being prepared for diploma defense.

That means:

- Offline-ish local demo matters
- Android APK installability matters
- iPhone stability matters
- Multi-device behavior against one backend matters
- Predictability matters more than code purity

Preferred defense scenario:

- Backend + PostgreSQL on laptop
- Phones connected to same local network
- Installed Android APK
- Optionally iPhone build later
- Runtime server URL can be changed from login screen if laptop IP changes

## Sharing / Delivery Materials

A delivery package was prepared in:

- [delivery](/E:/Курсовая/TestApp/delivery)

Important files there:

- [delivery/GeoKZN_share.zip](/E:/Курсовая/TestApp/delivery/GeoKZN_share.zip)
- [delivery/README_SEND_RU.md](/E:/Курсовая/TestApp/delivery/README_SEND_RU.md)
- [delivery/db/geomessenger_dump.sql](/E:/Курсовая/TestApp/delivery/db/geomessenger_dump.sql)

## Known Rough Edges

- Some files still contain mojibake / broken Russian encoding in source text
- Android Emulator on this Windows machine was unstable and crashed before app launch
- Real Android device / APK is more reliable than emulator for testing
- iPhone + Expo Go has shown map-related instability, so native-map changes should be handled cautiously

## Recommended First Checks In Any New Chat

If a future Codex chat needs to continue work, it should first inspect:

1. [app/_layout.tsx](/E:/Курсовая/TestApp/app/_layout.tsx)
2. [lib/api.ts](/E:/Курсовая/TestApp/lib/api.ts)
3. [components/MapScreen.tsx](/E:/Курсовая/TestApp/components/MapScreen.tsx)
4. [components/CreateEventScreen.tsx](/E:/Курсовая/TestApp/components/CreateEventScreen.tsx)
5. [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)
6. [package.json](/E:/Курсовая/TestApp/package.json)
7. [app.json](/E:/Курсовая/TestApp/app.json)
8. [eas.json](/E:/Курсовая/TestApp/eas.json)

## Safe Assumptions For Future Chats

- User prefers direct practical help over theory
- User often works from Windows PowerShell
- User wants Russian-facing UX
- User cares about demo reliability
- User may need context preserved across chats
- User is okay with project-level docs being added if they reduce repeated explanations
