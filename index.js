const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 4000;

// for connecting  MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'new1',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: true,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
}).single('image');

// this is a authentication aiddleware
const authenticate = (req, res, next) => {
    if (!req.session.loggedin) {
        res.redirect('/');
    } else {
        next();
    }
};

// i am  using  Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.send('Please enter both username and password');
        return;
    }

    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            console.error('Error authenticating user:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/notes');
        } else {
            res.send('Incorrect username or password');
        }
    });
});

app.get('/notes', authenticate, (req, res) => {
    db.query('SELECT * FROM notes', (err, results) => {
        if (err) {
            console.error('Error fetching notes:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.render('index', { notes: results });
    });
});

app.get('/notes/new', authenticate, (req, res) => {
    res.render('new');
});

app.post('/notes', authenticate, upload, (req, res) => {
    const { title, content } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const query = 'INSERT INTO notes (title, content, image) VALUES (?, ?, ?)';
    db.query(query, [title, content, image], (err, result) => {
        if (err) {
            console.error('Error creating note:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        console.log('Note created with ID:', result.insertId);
        res.redirect('/notes');
    });
});

app.get('/notes/:id/uploads', authenticate, (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT image FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note image:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const image = result[0].image;
        if (!image) {
            res.status(404).send('Image not found for this note');
            return;
        }
        res.render('uploads', { image });
    });
});

app.get('/notes/:id', authenticate, (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note details:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const { id, title, content } = result[0];
        res.render('details', { id, title, content });
    });
});

app.get('/notes/:id/edit', authenticate, (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note for editing:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const { id, title, content } = result[0];
        res.render('edit', { id, title, content });
    });
});

app.get('/notes', (req, res) => {
    db.query('SELECT * FROM notes', (err, results) => {
        if (err) {
            console.error('Error fetching notes:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.render('index.ejs', { notes: results });
    });
});

app.get('/notes/new', (req, res) => {
    res.render('new.ejs');
});

app.post('/notes', (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
    }

    const query = 'INSERT INTO notes (title, content) VALUES (?, ?)';
    db.query(query, [title, content], (err, result) => {
        if (err) {
            console.error('Error creating note:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        console.log('Note created with ID:', result.insertId);
        res.redirect('/notes');
    });
});

app.get('/notes/:id/update', (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note for update:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        const { id, title, content } = result[0];
        res.render('update.ejs', { id, title, content });
    });
});

app.post('/notes/:id/update', (req, res) => {
    const noteId = req.params.id;
    const { title, content } = req.body;

    if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
    }

    const query = 'UPDATE notes SET title=?, content=? WHERE id=?';
    db.query(query, [title, content, noteId], (err) => {
        if (err) {
            console.error('Error updating note:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        console.log('Note updated with ID:', noteId);
        res.redirect('/notes');
    });
});

app.get('/notes/:id/delete', (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
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

app.post('/notes/:id/delete', (req, res) => {
    const noteId = req.params.id;

    const query = 'DELETE FROM notes WHERE id=?';
    db.query(query, [noteId], (err) => {
        if (err) {
            console.error('Error deleting note:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        console.log('Note deleted with ID:', noteId);
        res.redirect('/notes');
    });
});
app.put('/notes/:id/update', (req, res) => {
    const noteId = req.params.id;
    const { title, content } = req.body;

    res.redirect('/login/notes');
});


app.delete('/notes/:id/delete', (req, res) => {
    const noteId = req.params.id;
    res.redirect('/notes');
});
app.get('/notes/:id', (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note details:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        const { id, title, content } = result[0];
        res.render('details.ejs', { id, title, content });
    });
});
app.get('/notes', authenticate, (req, res) => {
    db.query('SELECT * FROM notes', (err, results) => {
        if (err) {
            console.error('Error fetching notes:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const imageURL = 'path/to/your/image.jpg';
        res.render('index', { notes: results, image: imageURL });
    });
});
app.get('/notes/:id', authenticate, (req, res) => {
    const noteId = req.params.id;
    const query = 'SELECT * FROM notes WHERE id=?';
    db.query(query, [noteId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error fetching note details:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const { id, title, content, image } = result[0];
        res.render('details', { id, title, content, image });
    });
});


const PORT = process.env.PORT || port;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});