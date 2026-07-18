const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ── Auth ─────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();

    if (!ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Your account is not authorized for this app' });
    }

    const token = jwt.sign({ email, name: payload.name }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ email, name: payload.name });
  } catch (e) {
    console.error('Google auth error:', e);
    res.status(401).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) return res.json({ loggedIn: false });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ loggedIn: true, email: user.email, name: user.name });
  } catch {
    res.json({ loggedIn: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ ok: true });
});

// ── Database setup ──────────────────────────────────────────
const dbPath = process.env.DB_PATH || path.join(__dirname, 'worship.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    key TEXT DEFAULT 'C',
    author TEXT DEFAULT '',
    image TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL,
    type TEXT NOT NULL,
    position INTEGER NOT NULL,
    lyrics_en TEXT DEFAULT '',
    lyrics_te TEXT DEFAULT '',
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS setlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS setlist_songs (
    id TEXT PRIMARY KEY,
    setlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY(setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
  );
`);

// Seed sample songs if empty
const songCount = db.prepare('SELECT COUNT(*) as c FROM songs').get();
if (songCount.c === 0) {
  const insertSong = db.prepare('INSERT INTO songs (id,title,key,author,image) VALUES (?,?,?,?,?)');
  const insertSection = db.prepare('INSERT INTO sections (id,song_id,type,position,lyrics_en,lyrics_te) VALUES (?,?,?,?,?,?)');

  const songs = [
    { id: 'song-1', title: 'Amazing Grace', key: 'G', author: 'John Newton, 1779', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=800&fit=crop', sections: [
      { type: 'Verse 1', en: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see', te: 'అద్భుతమైన కృప, ఎంత మధురమైన శబ్దం\nఒక పాపిని రక్షించింది\nఒకప్పుడు తప్పిపోయాను, ఇప్పుడు కనిపించాను\nగుడ్డివాడిని, ఇప్పుడు చూస్తున్నాను' },
      { type: 'Chorus', en: "My chains are gone, I've been set free\nMy God, my Savior has ransomed me\nAnd like a flood His mercy reigns\nUnending love, amazing grace", te: 'నా సంకెళ్ళు పోయాయి, నేను విడుదల అయ్యాను\nనా దేవుడు, నా రక్షకుడు నన్ను విమోచించాడు' },
      { type: 'Verse 2', en: "Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed", te: 'కృపే నా హృదయానికి భయం నేర్పింది\nకృపే నా భయాలను తొలగించింది' },
    ]},
    { id: 'song-2', title: 'How Great Is Our God', key: 'A', author: 'Chris Tomlin', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=800&fit=crop', sections: [
      { type: 'Verse 1', en: 'The splendor of a King, clothed in majesty\nLet all the earth rejoice\nAll the earth rejoice', te: 'ఒక రాజు వైభవం, మహిమతో దుస్తులు ధరించి\nభూమి అంతా సంతోషించనీ' },
      { type: 'Chorus', en: 'How great is our God, sing with me\nHow great is our God\nAnd all will see how great\nHow great is our God', te: 'మన దేవుడు ఎంత గొప్పవాడు, నాతో పాడండి\nమన దేవుడు ఎంత గొప్పవాడు' },
      { type: 'Bridge', en: 'Name above all names\nWorthy of all praise\nMy heart will sing\nHow great is our God', te: 'అన్ని పేర్లకు పైన ఉన్న పేరు\nస్తుతికి అర్హమైనవాడు' },
    ]},
    { id: 'song-3', title: 'Blessed Be Your Name', key: 'D', author: 'Matt Redman', image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b0e?w=1200&h=800&fit=crop', sections: [
      { type: 'Verse 1', en: 'Blessed be Your name\nIn the land that is plentiful\nWhere Your streams of abundance flow\nBlessed be Your name', te: 'మీ నామమునకు స్తుతి కలుగుగాక\nసమృద్ధిగా ఉన్న భూమిలో' },
      { type: 'Chorus', en: 'Blessed be the name of the Lord\nBlessed be Your name\nBlessed be the name of the Lord\nBlessed be Your glorious name', te: 'ప్రభువు నామమునకు స్తుతి కలుగుగాక\nమీ నామమునకు స్తుతి కలుగుగాక' },
    ]},
  ];

  songs.forEach(s => {
    insertSong.run(s.id, s.title, s.key, s.author, s.image);
    s.sections.forEach((sec, i) => {
      insertSection.run(uuidv4(), s.id, sec.type, i, sec.en, sec.te);
    });
  });
}

// ── Helpers ─────────────────────────────────────────────────
function getSongWithSections(id) {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
  if (!song) return null;
  song.sections = db.prepare('SELECT * FROM sections WHERE song_id = ? ORDER BY position').all(id);
  return song;
}

function getAllSongs() {
  const songs = db.prepare('SELECT * FROM songs ORDER BY title').all();
  return songs.map(s => ({
    ...s,
    sections: db.prepare('SELECT * FROM sections WHERE song_id = ? ORDER BY position').all(s.id)
  }));
}

// ── Song Routes ──────────────────────────────────────────────
// NOTE: GET routes stay unauthenticated on purpose — the public
// /display page reads song data with no login, so it must be able
// to fetch these.
app.get('/api/songs', (req, res) => {
  res.json(getAllSongs());
});

app.get('/api/songs/:id', (req, res) => {
  const song = getSongWithSections(req.params.id);
  if (!song) return res.status(404).json({ error: 'Not found' });
  res.json(song);
});

app.post('/api/songs', requireAuth, (req, res) => {
  const { title, key = 'C', author = '', sections = [] } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO songs (id,title,key,author) VALUES (?,?,?,?)').run(id, title, key, author);
  sections.forEach((sec, i) => {
    db.prepare('INSERT INTO sections (id,song_id,type,position,lyrics_en,lyrics_te) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), id, sec.type || 'Verse 1', i, sec.lyrics_en || '', sec.lyrics_te || '');
  });
  const song = getSongWithSections(id);
  io.emit('songs:updated');
  res.status(201).json(song);
});

app.put('/api/songs/:id', requireAuth, (req, res) => {
  const { title, key, author, sections } = req.body;
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE songs SET title=?,key=?,author=?,updated_at=? WHERE id=?').run(title, key, author, now, req.params.id);
  db.prepare('DELETE FROM sections WHERE song_id=?').run(req.params.id);
  (sections || []).forEach((sec, i) => {
    db.prepare('INSERT INTO sections (id,song_id,type,position,lyrics_en,lyrics_te) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), req.params.id, sec.type, i, sec.lyrics_en || '', sec.lyrics_te || '');
  });
  const song = getSongWithSections(req.params.id);
  io.emit('songs:updated');
  res.json(song);
});

app.delete('/api/songs/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM songs WHERE id=?').run(req.params.id);
  io.emit('songs:updated');
  res.json({ ok: true });
});

// ── Setlist Routes ───────────────────────────────────────────
app.get('/api/setlists', requireAuth, (req, res) => {
  const lists = db.prepare('SELECT * FROM setlists ORDER BY created_at DESC').all();
  const result = lists.map(sl => ({
    ...sl,
    songs: db.prepare(`
      SELECT s.*, ss.position as setlist_position FROM setlist_songs ss
      JOIN songs s ON s.id = ss.song_id
      WHERE ss.setlist_id = ? ORDER BY ss.position
    `).all(sl.id)
  }));
  res.json(result);
});

app.post('/api/setlists', requireAuth, (req, res) => {
  const { name, date = '', songIds = [] } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO setlists (id,name,date) VALUES (?,?,?)').run(id, name, date);
  songIds.forEach((sid, i) => {
    db.prepare('INSERT INTO setlist_songs (id,setlist_id,song_id,position) VALUES (?,?,?,?)').run(uuidv4(), id, sid, i);
  });
  io.emit('setlists:updated');
  res.status(201).json({ id, name, date });
});

app.put('/api/setlists/:id', requireAuth, (req, res) => {
  const { name, date, songIds = [] } = req.body;
  db.prepare('UPDATE setlists SET name=?,date=? WHERE id=?').run(name, date, req.params.id);
  db.prepare('DELETE FROM setlist_songs WHERE setlist_id=?').run(req.params.id);
  songIds.forEach((sid, i) => {
    db.prepare('INSERT INTO setlist_songs (id,setlist_id,song_id,position) VALUES (?,?,?,?)').run(uuidv4(), req.params.id, sid, i);
  });
  io.emit('setlists:updated');
  res.json({ ok: true });
});

app.delete('/api/setlists/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM setlists WHERE id=?').run(req.params.id);
  io.emit('setlists:updated');
  res.json({ ok: true });
});

app.post('/api/songs/restore', requireAuth, (req, res) => {
  const { songs = [] } = req.body;
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'No songs found in backup file' });
  }

  const insertSong = db.prepare('INSERT OR REPLACE INTO songs (id,title,key,author) VALUES (?,?,?,?)');
  const deleteSections = db.prepare('DELETE FROM sections WHERE song_id = ?');
  const insertSection = db.prepare('INSERT INTO sections (id,song_id,type,position,lyrics_en,lyrics_te) VALUES (?,?,?,?,?,?)');

  const restoreAll = db.transaction((songsToRestore) => {
    songsToRestore.forEach(song => {
      const id = song.id || uuidv4();
      insertSong.run(id, song.title || 'Untitled', song.key || 'C', song.author || '');
      deleteSections.run(id);
      (song.sections || []).forEach((sec, i) => {
        insertSection.run(uuidv4(), id, sec.type || 'Verse 1', i, sec.lyrics_en || '', sec.lyrics_te || '');
      });
    });
  });

  try {
    restoreAll(songs);
    io.emit('songs:updated');
    res.json({ ok: true, count: songs.length });
  } catch (e) {
    console.error('Restore error:', e);
    res.status(500).json({ error: 'Restore failed: ' + e.message });
  }
});

// ── Socket.io — Live Presenter Sync ─────────────────────────
// Anyone can connect and receive presenter:state (needed for the
// public /display page), but only an authenticated socket
// (one that presents a valid auth_token cookie) can push updates.
io.use((socket, next) => {
  try {
    const rawCookies = socket.handshake.headers.cookie || '';
    const parsed = cookie.parse(rawCookies);
    const token = parsed.auth_token;
    if (token) {
      socket.user = jwt.verify(token, JWT_SECRET);
    }
    next();
  } catch {
    next(); // treat as unauthenticated viewer, don't hard-fail the connection
  }
});

const presenterState = {
  main: { songId: null, sectionIndex: 0, lang: 'en', blank: false }
};

io.on('connection', (socket) => {
  const room = socket.handshake.query.room || 'main';
  socket.join(room);

  socket.emit('presenter:state', presenterState[room] || presenterState.main);

  socket.on('presenter:update', (state) => {
    if (!socket.user) {
      return socket.emit('presenter:error', 'Not authorized to control the presenter');
    }
    presenterState[room] = { ...presenterState[room], ...state };
    socket.to(room).emit('presenter:state', presenterState[room]);
  });

  socket.on('disconnect', () => {});
});

// Serve the built React app
app.use(express.static(path.join(__dirname, 'client-dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'client-dist/index.html'));
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Worship Presenter server running on http://localhost:${PORT}`);
});