# Alumnyx

A production-ready cross-platform college alumni networking platform built with React Native (Expo), TypeScript, Node.js, Express, PostgreSQL, and Prisma ORM.

## Features

- **Role-Based Authentication**: Secure login and registration utilizing JWT. Users can join as Students or Alumni. Admin users are also supported.
- **Job & Internship Board**: Alumni and Admins can post jobs. Any user can browse and see opportunities.
- **Mentorship System**: Students can solicit real mentorship requests to registered Alumni. Mentors can accept or reject requests.
- **Alumni Feed**: A feed of posts and announcements where Alumni can share career advice and connections.
- **Real-time Messaging**: Enabled by `socket.io` for seamless chats among users.
- **Admin Dashboard**: Manage and verify users seamlessly in an organized portal interface.
- **Responsive Profile System**: Interactive profiles dynamically updating per user.
- **PostgreSQL Backend**: All backend data is stored in PostgreSQL using Prisma models and migrations.

## Project Structure

- `frontend/`: The Expo React Native application setup. Designed beautifully and optimized for Web/Android/iOS.
- `backend/`: Node.js + Express REST API using PostgreSQL (Prisma).
- `backend/prisma/`: Prisma schema and database mapping.

## Requirements

- Node.js (v18+ recommended)
- Expo CLI

## Setup Instructions

### 1. Backend Setup (PostgreSQL + Prisma)

Navigate to the `backend` folder:
```bash
cd backend
```

1. Install backend dependencies:
```bash
npm install
```
2. Initialize database schema:
```bash
node init_db.js
```
3. Seed default users (Admin, Alumni, Student) and starter content:
```bash
node seed.js
```
4. Start the server (runs on `http://localhost:5000` by default):
```bash
npm run dev
```

### 2. Frontend Setup

Open a new terminal session and navigate to `frontend`:
```bash
cd frontend
```

1. Install frontend dependencies: `npm install`
2. Start the Expo development server:
```bash
npx expo start --web
```
Press `w` to open in your web browser or `a`/`i` if you have Android Emulator / iOS Simulator connected.

## Default Seed Data

Running `node seed.js` from the backend directory adds default users to test out the application correctly:
- Admin account -> `admin@alumnyx.com` / `password123`
- Alumni account -> `alumni1@university.edu` / `password123`
- Student account (unverified) -> `student1@university.edu` / `password123`

## Database Storage

The backend stores all data in PostgreSQL tables managed through `backend/prisma/schema.prisma`, including:

- Users and Profiles
- Jobs and Job Applications
- Mentorship Requests
- Messages
- Posts and Post Likes
- Admin Logs and App Settings

Legacy JSON files and one-time migration script are archived in `backend/_archive/json-legacy-2026-04-14/`.

## Single Command Startup

From project root:

```bash
node start_app.js
```

This initializes PostgreSQL schema and starts backend + frontend.

Enjoy networking with Alumnyx!
