const pool = require('./db');
const bcrypt = require('bcrypt');

const saltRounds = 10; // For hashing passwords

// GET all users
const getUsers = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, username, useremail, "userGroup" FROM users ORDER BY id ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET a single user by ID
const getUserById = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const { rows } = await pool.query('SELECT id, username, useremail, "userGroup" FROM users WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// CREATE a new user
const createUser = async (req, res) => {
    const { username, useremail, password, userGroup } = req.body;

    if (!username || !useremail || !password || !userGroup) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const { rows } = await pool.query(
            'INSERT INTO users (username, useremail, password, "userGroup") VALUES ($1, $2, $3, $4) RETURNING id, username, useremail, "userGroup"',
            [username, useremail, hashedPassword, userGroup]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE a user
const updateUser = async (req, res) => {
    const id = parseInt(req.params.id);
    const { username, useremail, userGroup } = req.body;

    if (!username || !useremail || !userGroup) {
        return res.status(400).json({ error: 'Username, email, and userGroup are required' });
    }

    try {
        const { rows } = await pool.query(
            'UPDATE users SET username = $1, useremail = $2, "userGroup" = $3 WHERE id = $4 RETURNING id, username, useremail, "userGroup"',
            [username, useremail, userGroup, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE a user
const deleteUser = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE user password
const updateUserPassword = async (req, res) => {
    const id = parseInt(req.params.id);
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
};
