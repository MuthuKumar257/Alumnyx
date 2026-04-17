const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

let app;

function createApp() {
  const api = express();

  api.use(cors());
  api.use(express.json());
  api.use(express.urlencoded({ extended: true }));

  api.get('/', (req, res) => {
    res.status(200).json({ message: 'Alumnyx API is running on Next.js' });
  });

  api.use('/auth', require('../../routes/authRoutes'));
  api.use('/users', require('../../routes/userRoutes'));
  api.use('/profiles', require('../../routes/profileRoutes'));
  api.use('/alumni', require('../../routes/alumniRoutes'));
  api.use('/jobs', require('../../routes/jobRoutes'));
  api.use('/mentorship', require('../../routes/mentorshipRoutes'));
  api.use('/posts', require('../../routes/postRoutes'));
  api.use('/messages', require('../../routes/messageRoutes'));
  api.use('/admin', require('../../routes/adminRoutes'));

  api.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  api.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred', error: err.message });
  });

  return api;
}

export default function handler(req, res) {
  if (!app) {
    app = createApp();
  }

  // Next.js API catch-all keeps the /api prefix in req.url; strip it so
  // existing Express route mounts (/auth, /users, ...) continue to work.
  if (typeof req.url === 'string') {
    req.url = req.url.replace(/^\/api(?=\/|$)/, '') || '/';
  }

  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
