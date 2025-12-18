// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { getUsers, getUserById, createUser, updateUser, deleteUser, updateUserPassword } = require('./users');
const pool = require('./db');
const bcrypt = require('bcrypt');

require('dotenv').config();

const { writeToBlockchain } = require('./writeToBlockchain');
const { getMessagesByServer } = require('./retrieveLog');

const app = express();
const port = process.env.PORT || 3001;
// app.use(cors());
app.use(cors(
    { origin: 'http://35.206.215.230:5173', credentials: true },
    { origin: 'http://localhost:5173', credentials: true },
    { origin: 'http://localhost:2222', credentials: true }
));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.json());

// Secret key for signing JWTs (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || 'DEB';

// Dummy user data for demo (replace with real user DB lookup)
const users = [
    { id: 1, username: 'abc@abc.com', password: 'abcabcabc' },
    { id: 2, username: 'user2', password: 'password2' },
];

// Login endpoint
app.post('/login', async (req, res) => {
    const { useremail, password } = req.body;
    console.log("Login attempt with user email:", useremail);
    // Basic validation
    if (!useremail || !password) {
        return res.status(400).json({ message: 'Useremail and password required' });
    }
    try {
        // 2. Find the user in the database by their email
        const userQuery = await pool.query('SELECT * FROM users WHERE useremail = $1', [useremail]);

        if (userQuery.rows.length === 0) {
            console.log("User not found for email:", useremail);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userQuery.rows[0];
        console.log("User found:", user);

        // 3. Compare the provided password with the stored hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            console.log("Password mismatch for user:", useremail);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 4. User authenticated - create JWT payload (do not include password)
        const payload = {
            id: user.id,
            username: user.username,
            useremail: user.useremail,
            userGroup: user.userGroup
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '1h', // Token expires in 1 hour
        });

        // 5. Set JWT in an HttpOnly cookie for security
        res.cookie('sessionId', token, {
            httpOnly: true, // Prevents client-side script access
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            sameSite: 'strict', // Mitigates CSRF attacks
            maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
            path: "/"
        });

        res.status(200).json({
            username: user.username,
            useremail: user.useremail,
            userGroup: user.userGroup
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Middleware to verify JWT from cookie
function authenticateToken(req, res, next) {
    const token = req.cookies['sessionId'];
    console.log("Token from cookie:", token);
    if (!token) {
        return res.status(401).json({ message: 'Missing or unauthorized token' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
}

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({
        username: req.user.username,
        useremail: req.user.useremail,
        userGroup: req.user.userGroup
    });
});

// Logout route - clear cookie
app.post('/signout', (req, res) => {
    console.log("Logout attempt");
    res.clearCookie('sessionId', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/', // Match the path used when setting the cookie
    });
    res.json({ message: 'Logged out successfully' });
});



// POST /write - write data to blockchain
app.post('/write', async (req, res) => {
    try {
        const { timestamp, server, message } = req.body;
        if (!timestamp || !server || !message) {
            return res.status(400).json({ error: `Missing information in request body` });
        }

        const receiptData = await writeToBlockchain(req.body);
        let sanitizedEvents = [];
        if (receiptData.events && receiptData.events.length > 0) {
            sanitizedEvents = receiptData.events.map(event => ({
                ...event,
                eventArgs: Object.fromEntries(
                    Object.entries(event.eventArgs).map(([key, value]) =>
                        typeof value === 'bigint' ? [key, value.toString()] : [key, value]
                    )
                )
            }));
        }
        res.json({ success: true, txHash: receiptData.txHash, events: sanitizedEvents, blockNumber: receiptData.blockNumber });
    } catch (err) {
        console.error("Error writing to blockchain:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /events - fetch or listen to events
// app.get('/getMessageByCriticalLevel/:criticalLevel', async (req, res) => {
//     try {
//         const criticalLevel = Number(req.params.criticalLevel);

//         if (isNaN(criticalLevel) || criticalLevel < 0) {
//             return res.status(400).json({ error: "Invalid criticalLevel parameter" });
//         }

//         const decodedMessages = await getMessagesByCriticalLevel(criticalLevel);

//         res.json({ success: true, data: decodedMessages });
//     } catch (err) {
//         console.error("Error fetching events:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

app.get('/getMessagesByServer/:server', authenticateToken, async (req, res) => {
    try {
        const server = Number(req.params.server);

        if (isNaN(server) || server < 0) {
            return res.status(400).json({ error: "Invalid server parameter" });
        }

        const decodedMessages = await getMessagesByServer(server);
        res.json({ success: true, data: decodedMessages });
    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/changeTimestamp', async (req, res) => {
    try {
        console.log(req.body);
        const { timestamp } = req.body;
        if (!timestamp) {
            return res.status(400).json({ error: "Missing 'data' in request body" });
        }

        res.json({ success: true, data: timestamp });
    } catch (err) {
        console.error("Error changing timestamp:", err);
        res.status(500).json({ error: err.message });
    }
}
)


app.get('/healthCheck', async (req, res) => {
    try {
        res.status(200).json({ status: "OK", message: "server is running" });
    } catch (err) {
        console.error("Error in healthCheck:", err);
        res.status(500).json({ error: err.message });
    }
})

app.get('/users', getUsers);
app.get('/users/:id', getUserById);
app.post('/users', createUser);
app.put('/users/:id', updateUser);
app.delete('/users/:id', deleteUser);
app.patch('/users/:id/password', updateUserPassword); // Use PATCH for partial updates like password


app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
});
