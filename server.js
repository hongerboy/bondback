const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new Database(path.join(__dirname, 'db', 'bondback.db'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT,
        expected_return_date TEXT,
        cleaning_plan TEXT,
        professional_cleaning_clause TEXT,
        source_page TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const insertLead = db.prepare(`
    INSERT INTO leads (name, phone, city, expected_return_date, cleaning_plan, professional_cleaning_clause, source_page)
    VALUES (@name, @phone, @city, @expectedReturnDate, @cleaningPlan, @professionalCleaningClause, @sourcePage)
`);

// API Routes
app.post('/api/leads', (req, res) => {
    try {
        const data = {
            name: req.body.name || '',
            phone: req.body.phone || '',
            city: req.body.city || '',
            expectedReturnDate: req.body.expectedReturnDate || '',
            cleaningPlan: req.body.cleaningPlan || '',
            professionalCleaningClause: req.body.professionalCleaningClause || '',
            sourcePage: req.body.sourcePage || 'homepage'
        };

        const result = insertLead.run(data);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        console.error('Error saving lead:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save lead' });
    }
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Start server
app.listen(PORT, () => {
    console.log(`BondBack Hero server running on http://localhost:${PORT}`);
});
