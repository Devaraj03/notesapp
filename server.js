const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'supersecret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json()); // IMPORTANT for parsing JSON body

app.post('/notes/edit/:id', (req, res) => {
  const id = req.params.id;
  const { content } = req.body;
  db.run('UPDATE notes SET content = ? WHERE id = ?', [content, id], (err) => {
    if (err) return res.status(500).send('Error updating note');
    res.sendStatus(200);
  });
});

function authRequired(req, res, next) {
  if (!req.session.userId) return res.redirect('/login.html');
  next();
}

app.get('/', (req, res) => res.redirect('/login.html'));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], err => {
    if (err) return res.send("User already exists");
    res.redirect('/login.html');
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send("Invalid credentials");
    }
    req.session.userId = user.id;
    res.redirect('/notes.html');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

app.get('/notes-data', authRequired, (req, res) => {
  db.all(`SELECT * FROM notes WHERE user_id = ?`, [req.session.userId], (err, notes) => {
    res.json(notes);
  });
});

app.post('/notes', authRequired, (req, res) => {
  db.run(`INSERT INTO notes (user_id, content) VALUES (?, ?)`, [req.session.userId, req.body.content], () => {
    res.redirect('/notes.html');
  });
});

app.post('/notes/delete/:id', authRequired, (req, res) => {
  db.run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], () => {
    res.redirect('/notes.html');
  });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));



