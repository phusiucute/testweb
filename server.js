const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(session({
  secret: 'tailieu_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const dbConfig = {
  host: 'localhost',
  user: 'root', // đổi thành user của bạn
  password: '', // đổi thành pass của bạn
  database: 'kho_tailieu'
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+"-"+file.originalname);
  }
});
const upload = multer({ storage });

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Bạn phải đăng nhập' });
  next();
}

// Đăng ký
app.post('/api/register', async (req, res) => {
  const { username, password, gender } = req.body;
  if (!username || !password) return res.json({ error: 'Thiếu thông tin' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const db = await mysql.createConnection(dbConfig);
    await db.execute("INSERT INTO users (username, password, gender) VALUES (?, ?, ?)", [username, hash, gender||'other']);
    res.json({ message: "Đăng ký thành công" });
    await db.end();
  } catch (e) {
    res.json({ error: 'Tên tài khoản đã tồn tại' });
  }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.execute("SELECT * FROM users WHERE username=?", [username]);
  if (rows.length === 0) return res.json({ error: 'Sai tài khoản hoặc mật khẩu' });
  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ error: 'Sai tài khoản hoặc mật khẩu' });
  req.session.user = { id: user.id, username: user.username, gender: user.gender, avatar: user.avatar };
  res.json({ id: user.id, username: user.username, gender: user.gender, avatar: user.avatar });
  await db.end();
});

// Đăng xuất
app.post('/api/logout', (req, res) => {
  req.session.destroy(()=>res.json({message:"Đã đăng xuất"}));
});

// Lấy thông tin tài khoản
app.get('/api/profile', requireLogin, async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.execute("SELECT id, username, gender, avatar FROM users WHERE id=?", [req.session.user.id]);
  res.json(rows[0]);
  await db.end();
});

// Cập nhật avatar
app.post('/api/profile/avatar', requireLogin, upload.single('avatar'), async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.execute("SELECT avatar FROM users WHERE id=?", [req.session.user.id]);
  if (rows[0].avatar && fs.existsSync("uploads/"+rows[0].avatar)) {
    fs.unlinkSync("uploads/"+rows[0].avatar);
  }
  await db.execute("UPDATE users SET avatar=? WHERE id=?", [req.file.filename, req.session.user.id]);
  req.session.user.avatar = req.file.filename;
  res.json({ avatar: req.file.filename });
  await db.end();
});

// Lấy danh sách tài liệu
app.get('/api/documents', async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.execute("SELECT * FROM documents ORDER BY created_at DESC");
  res.json(rows);
  await db.end();
});

// Thêm tài liệu (demo, production nên kiểm tra quyền admin)
app.post('/api/documents', requireLogin, async (req, res) => {
  const { title, description, subject, class:clazz } = req.body;
  if (!title || !clazz) return res.json({ error: 'Thiếu thông tin' });
  const db = await mysql.createConnection(dbConfig);
  await db.execute("INSERT INTO documents (title, description, subject, class) VALUES (?, ?, ?, ?)", [title, description, subject, clazz]);
  res.json({ message: "Thêm thành công" });
  await db.end();
});

// Chat tài liệu: thêm tin nhắn
app.post('/api/document/:id/chat', requireLogin, async (req, res) => {
  const { message } = req.body;
  const document_id = req.params.id;
  if (!message) return res.json({ error: 'Không có nội dung' });
  const db = await mysql.createConnection(dbConfig);
  await db.execute("INSERT INTO document_chats (document_id, user_id, message) VALUES (?, ?, ?)", [document_id, req.session.user.id, message]);
  res.json({ message: "OK" });
  await db.end();
});

// Lấy chat tài liệu
app.get('/api/document/:id/chat', async (req, res) => {
  const document_id = req.params.id;
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.execute(
    "SELECT document_chats.*,users.username,users.avatar FROM document_chats JOIN users ON document_chats.user_id=users.id WHERE document_id=? ORDER BY sent_at ASC",
    [document_id]
  );
  res.json(rows);
  await db.end();
});

// Thả tym tài liệu
app.post('/api/document/:id/like', requireLogin, async (req, res) => {
  const document_id = req.params.id;
  const db = await mysql.createConnection(dbConfig);
  try {
    await db.execute("INSERT IGNORE INTO document_likes (document_id, user_id) VALUES (?, ?)", [document_id, req.session.user.id]);
    res.json({ message: "Đã tym" });
  } catch (e) {
    res.json({ error: "Lỗi tym" });
  }
  await db.end();
});

// Kiểm tra tài liệu đã tym chưa, tổng số tym
app.get('/api/document/:id/like', requireLogin, async (req, res) => {
  const document_id = req.params.id;
  const db = await mysql.createConnection(dbConfig);
  const [[count]] = await db.execute("SELECT COUNT(*) as total FROM document_likes WHERE document_id=?", [document_id]);
  const [[liked]] = await db.execute("SELECT * FROM document_likes WHERE document_id=? AND user_id=?", [document_id, req.session.user.id]);
  res.json({ total: count.total, liked: !!liked });
  await db.end();
});

app.listen(PORT, () => {
  console.log("Server running http://localhost:" + PORT);
});