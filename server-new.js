// ═══════════════════════════════════════════════════════════
// FIXMIND - MAIN SERVER
// Backend cu auth, clase, teste și AI
// ═══════════════════════════════════════════════════════════

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-super-secure-2024';

// ═══════════════════════════════════════════════════════════
// DATABASE CONNECTION POOL
// ═══════════════════════════════════════════════════════════
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fixmind',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE - Verify JWT Token
// ═══════════════════════════════════════════════════════════
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token lipsă' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalid sau expirat' });
        req.user = user;
        next();
    });
};

// ═══════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════

// REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, type, materia } = req.body;

        if (!email || !password || !first_name || !last_name || !type) {
            return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Email invalid' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere' });
        }

        if (!['profesor', 'elev'].includes(type)) {
            return res.status(400).json({ error: 'Tip invalid' });
        }

        const connection = await pool.getConnection();
        try {
            const [existing] = await connection.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email-ul este deja înregistrat' });
            }

            const password_hash = await bcrypt.hash(password, 10);

            const [result] = await connection.execute(
                'INSERT INTO users (email, password_hash, first_name, last_name, type, oauth_provider) VALUES (?, ?, ?, ?, ?, ?)',
                [email, password_hash, first_name, last_name, type, 'local']
            );

            const userId = result.insertId;

            if (type === 'profesor') {
                await connection.execute(
                    'INSERT INTO profesori (user_id, materia) VALUES (?, ?)',
                    [userId, materia || 'Psihologie']
                );
            }

            const token = jwt.sign({ id: userId, email, type }, JWT_SECRET, { expiresIn: '7d' });

            res.status(201).json({
                message: 'Cont creat cu succes',
                token,
                user: { id: userId, email, first_name, last_name, type }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Eroare la înregistrare' });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email și parolă sunt obligatorii' });
        }

        const connection = await pool.getConnection();
        try {
            const [users] = await connection.execute(
                'SELECT id, email, password_hash, first_name, last_name, type FROM users WHERE email = ? AND oauth_provider = "local"',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: 'Email sau parolă incorectă' });
            }

            const user = users[0];
            const passwordMatch = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Email sau parolă incorectă' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, type: user.type },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login reușit',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    type: user.type
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Eroare la autentificare' });
    }
});

// ═══════════════════════════════════════════════════════════
// PROFESOR ROUTES - Classes & Management
// ═══════════════════════════════════════════════════════════

// CREATE CLASS
app.post('/api/profesor/clase', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'profesor') {
            return res.status(403).json({ error: 'Doar profesori pot crea clase' });
        }

        const { nume, descriere } = req.body;
        if (!nume) return res.status(400).json({ error: 'Nume clasă obligatoriu' });

        const connection = await pool.getConnection();
        try {
            const [profesor] = await connection.execute(
                'SELECT id FROM profesori WHERE user_id = ?',
                [req.user.id]
            );

            if (profesor.length === 0) {
                return res.status(404).json({ error: 'Profil profesor nu găsit' });
            }

            // Generate unique invitation code
            const cod_invitatie = Math.random().toString(36).substring(2, 8).toUpperCase();

            const [result] = await connection.execute(
                'INSERT INTO clase (profesor_id, nume, cod_invitatie, descriere) VALUES (?, ?, ?, ?)',
                [profesor[0].id, nume, cod_invitatie, descriere || '']
            );

            res.status(201).json({
                message: 'Clasă creată cu succes',
                clasa: {
                    id: result.insertId,
                    nume,
                    cod_invitatie,
                    descriere
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ error: 'Eroare la crearea clasei' });
    }
});

// GET PROFESSOR CLASSES
app.get('/api/profesor/clase', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'profesor') {
            return res.status(403).json({ error: 'Doar profesori pot accesa aceasta' });
        }

        const connection = await pool.getConnection();
        try {
            const [profesor] = await connection.execute(
                'SELECT id FROM profesori WHERE user_id = ?',
                [req.user.id]
            );

            if (profesor.length === 0) {
                return res.status(404).json({ error: 'Profil profesor nu găsit' });
            }

            const [clase] = await connection.execute(
                `SELECT c.id, c.nume, c.cod_invitatie, c.descriere, c.created_at,
                COUNT(i.id) as numar_elevi
                FROM clase c
                LEFT JOIN inscrisuri i ON c.id = i.clasa_id
                WHERE c.profesor_id = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC`,
                [profesor[0].id]
            );

            res.json({ clase });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Eroare la preluarea claselor' });
    }
});

// ═══════════════════════════════════════════════════════════
// ELEV ROUTES - Join Class & Dashboard
// ═══════════════════════════════════════════════════════════

// JOIN CLASS
app.post('/api/elev/join-class', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'elev') {
            return res.status(403).json({ error: 'Doar elevi pot se alatura unei clase' });
        }

        const { cod_invitatie } = req.body;
        if (!cod_invitatie) {
            return res.status(400).json({ error: 'Cod invitatie obligatoriu' });
        }

        const connection = await pool.getConnection();
        try {
            const [clase] = await connection.execute(
                'SELECT id FROM clase WHERE cod_invitatie = ?',
                [cod_invitatie.toUpperCase()]
            );

            if (clase.length === 0) {
                return res.status(404).json({ error: 'Cod invitatie invalid' });
            }

            const clasa_id = clase[0].id;

            // Check if student is already in a class (they can only be in one)
            const [existing] = await connection.execute(
                'SELECT id FROM inscrisuri WHERE elev_id = ?',
                [req.user.id]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Ești deja înscris într-o clasă' });
            }

            await connection.execute(
                'INSERT INTO inscrisuri (elev_id, clasa_id) VALUES (?, ?)',
                [req.user.id, clasa_id]
            );

            res.json({ message: 'Te-ai alăturat clasei cu succes' });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Join class error:', error);
        res.status(500).json({ error: 'Eroare la alăturare clasei' });
    }
});

// ═══════════════════════════════════════════════════════════
// AI CHAT ENDPOINT (original)
// ═══════════════════════════════════════════════════════════
const COURSE_CONTEXT = `Tu ești un asistent educațional pentru un curs de Psihologie - Clasa X, 
cu tema "Gândirea și Inteligența". Trebuie să răspunzi DOAR la întrebări legate de:

1. GÂNDIREA
2. PROCESELE GÂNDIRII
3. FORMELE LOGICE ALE GÂNDIRII
4. NATURA INTELIGENȚEI
5. MĂSURAREA INTELIGENȚEI

Explică răspunsurile în limbă română cu exemple practice.`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Mesajul e gol' });
        if (!OPENAI_API_KEY) return res.status(500).json({ error: 'API Key nu e configurat' });

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: COURSE_CONTEXT },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResponse = response.data.choices[0].message.content;
        res.json({ response: aiResponse });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ error: 'Eroare la procesarea întrebării' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server funcționează!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🤖 Server FixMind funcționează pe http://localhost:${PORT}`);
    console.log(`📚 Auth endpoints: /api/auth/register, /api/auth/login`);
    console.log(`🏫 Profesor endpoints: /api/profesor/clase`);
    console.log(`👨‍🎓 Elev endpoints: /api/elev/join-class`);
    console.log(`💬 AI Chat: /api/chat`);
});
