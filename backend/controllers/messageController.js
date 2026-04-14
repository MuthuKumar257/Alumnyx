const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso } = require('../storage/viewHelpers');

const isConnectedPair = (connections, userA, userB) =>
    connections.some(
        (c) =>
            (c.userId === userA && c.connectionId === userB) ||
            (c.userId === userB && c.connectionId === userA)
    );

const getConversations = async (req, res) => {
    try {
        const [messages, users, profiles] = await Promise.all([
            readJson('messages'),
            readUsers(),
            readJson('profiles'),
        ]);

        const userId = req.user.id;
        const relevant = messages
            .filter((m) => m.senderId === userId || m.receiverId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const map = new Map();
        for (const msg of relevant) {
            const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!map.has(otherId)) {
                const otherUser = users.find((u) => u.id === otherId);
                map.set(otherId, {
                    user: otherUser ? sanitizeUser(withProfile(otherUser, profiles)) : null,
                    lastMessage: msg.content,
                    lastMessageAt: msg.createdAt,
                    unread: msg.receiverId === userId && !msg.isRead ? 1 : 0,
                });
            } else if (msg.receiverId === userId && !msg.isRead) {
                map.get(otherId).unread += 1;
            }
        }

        res.json(Array.from(map.values()));
    } catch (error) {
        console.error('GetConversations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const otherId = req.params.userId || req.params.conversationId;

        const [messages, profiles, users, connections] = await Promise.all([
            readJson('messages'),
            readJson('profiles'),
            readUsers(),
            readJson('connections'),
        ]);

        if (!isConnectedPair(connections, userId, otherId)) {
            return res.status(403).json({ message: 'You can message only accepted connections' });
        }

        const conversation = messages
            .filter((m) =>
                (m.senderId === userId && m.receiverId === otherId) ||
                (m.senderId === otherId && m.receiverId === userId)
            )
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((m) => {
                const sender = users.find((u) => u.id === m.senderId);
                return {
                    ...m,
                    sender: sender ? { id: sender.id, profile: withProfile(sender, profiles).profile } : null,
                };
            });

        const nextMessages = messages.map((m) => {
            if (m.senderId === otherId && m.receiverId === userId && !m.isRead) {
                return { ...m, isRead: true, updatedAt: nowIso() };
            }
            return m;
        });

        await queueWrite('messages', nextMessages);
        res.json(conversation);
    } catch (error) {
        console.error('GetMessages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        if (!receiverId || !String(content || '').trim()) {
            return res.status(400).json({ message: 'receiverId and content are required' });
        }

        const [users, profiles, messages, connections] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('messages'),
            readJson('connections'),
        ]);

        const receiver = users.find((u) => u.id === receiverId);
        if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

        if (!isConnectedPair(connections, req.user.id, receiverId)) {
            return res.status(403).json({ message: 'You can message only accepted connections' });
        }

        const now = nowIso();
        const message = {
            id: uuidv4(),
            senderId: req.user.id,
            receiverId,
            content: String(content).trim(),
            isRead: false,
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('messages', [...messages, message]);

        const senderUser = users.find((u) => u.id === req.user.id);
        res.status(201).json({
            ...message,
            sender: senderUser ? { id: senderUser.id, profile: withProfile(senderUser, profiles).profile } : null,
            receiver: { id: receiver.id, profile: withProfile(receiver, profiles).profile },
        });
    } catch (error) {
        console.error('SendMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getConversations, getMessages, sendMessage };
