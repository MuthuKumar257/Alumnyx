const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso } = require('../storage/viewHelpers');

const getPostLikes = (post) => Array.isArray(post.likes) ? post.likes : [];

const getPosts = async (req, res) => {
    try {
        const [posts, users, profiles] = await Promise.all([
            readJson('posts'),
            readUsers(),
            readJson('profiles'),
        ]);

        const data = posts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((post) => {
                const likes = getPostLikes(post);
                const author = users.find((u) => u.id === post.authorId);
                return {
                    ...post,
                    author: author ? sanitizeUser(withProfile(author, profiles)) : null,
                    likeCount: likes.length,
                    likedByMe: likes.includes(req.user.id),
                };
            });

        res.json(data);
    } catch (error) {
        console.error('GetPosts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPostById = async (req, res) => {
    try {
        const [posts, users, profiles] = await Promise.all([
            readJson('posts'),
            readUsers(),
            readJson('profiles'),
        ]);

        const post = posts.find((p) => p.id === req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const likes = getPostLikes(post);
        const author = users.find((u) => u.id === post.authorId);

        res.json({
            ...post,
            author: author ? sanitizeUser(withProfile(author, profiles)) : null,
            likeCount: likes.length,
            likedByMe: likes.includes(req.user.id),
        });
    } catch (error) {
        console.error('GetPostById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createPost = async (req, res) => {
    try {
        const { content, mediaUrl } = req.body;
        if (!String(content || '').trim()) {
            return res.status(400).json({ message: 'Post content cannot be empty' });
        }

        const [posts, users, profiles] = await Promise.all([
            readJson('posts'),
            readUsers(),
            readJson('profiles'),
        ]);

        const now = nowIso();
        const post = {
            id: uuidv4(),
            authorId: req.user.id,
            content: String(content).trim(),
            mediaUrl: mediaUrl || null,
            likes: [],
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('posts', [...posts, post]);

        const author = users.find((u) => u.id === req.user.id);
        res.status(201).json({
            ...post,
            author: author ? sanitizeUser(withProfile(author, profiles)) : null,
            likeCount: 0,
            likedByMe: false,
        });
    } catch (error) {
        console.error('CreatePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deletePost = async (req, res) => {
    try {
        const posts = await readJson('posts');
        const idx = posts.findIndex((p) => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Post not found' });

        const post = posts[idx];
        if (post.authorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await queueWrite('posts', posts.filter((p) => p.id !== req.params.id));
        res.json({ message: 'Post removed successfully' });
    } catch (error) {
        console.error('DeletePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const toggleLikePost = async (req, res) => {
    try {
        const posts = await readJson('posts');
        const idx = posts.findIndex((p) => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Post not found' });

        const likes = getPostLikes(posts[idx]);
        const liked = likes.includes(req.user.id);
        const nextLikes = liked ? likes.filter((id) => id !== req.user.id) : [...likes, req.user.id];

        const updated = { ...posts[idx], likes: nextLikes, updatedAt: nowIso() };
        const nextPosts = [...posts];
        nextPosts[idx] = updated;

        await queueWrite('posts', nextPosts);
        res.json({ liked: !liked, likeCount: nextLikes.length });
    } catch (error) {
        console.error('ToggleLikePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getPosts, getPostById, createPost, deletePost, toggleLikePost };
