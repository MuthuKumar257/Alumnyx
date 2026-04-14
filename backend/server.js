const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

app.use(cors());
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
