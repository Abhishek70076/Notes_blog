const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const app = express();
const port = 4000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Parse incoming JSON requests
app.use(bodyParser.json());

// MySQL connection setup using mysql2
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'new1' // assuming 'new1' is your database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Render form to create a new note
app.get('/notes/new', (req, res) => {
    res.render('new.ejs');
});

// Create a new note
app.post('/notes', (req, res) => {
    const { title, content } = req.body;

    console.log('Received request with title:', title, 'and content:', content);

    // Check if title and content are not empty
    if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
    }

    const query = 'INSERT INTO new1.new (title, content) VALUES (?, ?)';
    db.query(query, [title, content], (err, result) => {
        if (err) {
            console.error('Error creating note:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ id: result.insertId, title, content });
    });
});

// Other routes...

// Delete a note (render delete.ejs)
app.get('/notes/:id/delete', (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM new1.new WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note for delete:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        const { id, title, content } = result[0];
        res.render('delete.ejs', { id, title, content });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});