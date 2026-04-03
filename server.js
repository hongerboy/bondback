const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Geo-blocking: only allow Hong Kong (HK) and Australia (AU)
const ALLOWED_COUNTRIES = ['HK', 'AU'];

function geoBlock(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    // Allow localhost / private IPs (for local development)
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return next();
    }

    const geo = geoip.lookup(ip);
    if (!geo || !ALLOWED_COUNTRIES.includes(geo.country)) {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html><head><title>Access Restricted</title>
            <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;color:#333;}
            .container{text-align:center;padding:2rem;}</style></head>
            <body><div class="container">
            <h1>Access Restricted</h1>
            <p>This service is only available in Australia and Hong Kong.</p>
            </div></body></html>
        `);
    }
    next();
}

// Middleware
app.use(geoBlock);
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'docs')));

// Rate limiting (in-memory, per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max submissions per window

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { start: now, count: 1 });
        return next();
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ success: false, error: 'Too many submissions. Please try again later.' });
    }
    next();
}

// Clean up stale rate limit entries every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now - entry.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
    }
}, 30 * 60 * 1000);

// Database setup
const db = new Database(path.join(__dirname, 'db', 'bondback.db'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        city TEXT,
        expected_return_date TEXT,
        cleaning_plan TEXT,
        professional_cleaning_clause TEXT,
        source_page TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Add email column if it doesn't exist (migration for existing DBs)
try {
    db.exec('ALTER TABLE leads ADD COLUMN email TEXT');
} catch (_) {
    // Column already exists
}

const insertLead = db.prepare(`
    INSERT INTO leads (name, phone, email, city, expected_return_date, cleaning_plan, professional_cleaning_clause, source_page)
    VALUES (@name, @phone, @email, @city, @expectedReturnDate, @cleaningPlan, @professionalCleaningClause, @sourcePage)
`);

// Input validation helper
function sanitize(val, maxLen) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen);
}

// API Routes
app.post('/api/leads', rateLimit, (req, res) => {
    try {
        const name = sanitize(req.body.name, 200);
        const phone = sanitize(req.body.phone, 30);

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Name and phone are required.' });
        }

        const data = {
            name,
            phone,
            email: sanitize(req.body.email, 254),
            city: sanitize(req.body.city, 100),
            expectedReturnDate: sanitize(req.body.expectedReturnDate, 20),
            cleaningPlan: sanitize(req.body.cleaningPlan, 100),
            professionalCleaningClause: sanitize(req.body.professionalCleaningClause, 20),
            sourcePage: sanitize(req.body.sourcePage, 50) || 'homepage'
        };

        const result = insertLead.run(data);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        console.error('Error saving lead:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save lead' });
    }
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start server
app.listen(PORT, () => {
    console.log(`BondBack Hero server running on http://localhost:${PORT}`);
});
