const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const app = express();
const server = http.createServer(app);

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
];

const envAllowedOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const normalizeOrigin = (origin) => String(origin || '').trim().toLowerCase().replace(/\/+$/, '');

const EXPLICIT_ALLOWED_ORIGINS = ['http://localhost:8081'];

const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXPLICIT_ALLOWED_ORIGINS, ...envAllowedOrigins])]
    .map(normalizeOrigin);

const isLocalDevOrigin = (origin) => /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || '').trim());

const corsOptions = {
    origin(origin, callback) {
        const normalizedOrigin = normalizeOrigin(origin);
        if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalDevOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const requestedHeaders = req.headers['access-control-request-headers'];

    if (origin && (allowedOrigins.includes(normalizeOrigin(origin)) || isLocalDevOrigin(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    next();
});

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
    },
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io for Real-time Messaging
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their personal room.`);
    });

    socket.on('send_message', (data) => {
        io.to(data.receiverId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Alumnyx API is running with PostgreSQL (Prisma) storage');
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/profiles', require('./routes/profileRoutes'));
app.use('/api/alumni', require('./routes/alumniRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/mentorship', require('./routes/mentorshipRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/messages', require('./routes/messageRoutes')); // New route
app.use('/api/admin', require('./routes/adminRoutes'));     // New route

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
