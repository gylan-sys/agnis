import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import { SignJWT, jwtVerify } from "jose";
import cors from "cors";

import fs from "fs";

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database.Database;
try {
  db = new Database(path.join(DATA_DIR, "family_finance.db"));
} catch (err: any) {
  console.error("FAILED TO OPEN DATABASE:", err.message);
  console.error("Ensuring data directory exists at:", DATA_DIR);
  process.exit(1);
}
const SECRET = new TextEncoder().encode("asdf-secret-123");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT,
    ownerId TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS members (
    householdId TEXT,
    userId TEXT,
    displayName TEXT,
    email TEXT,
    role TEXT,
    joinedAt TEXT,
    PRIMARY KEY (householdId, userId)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    amount REAL,
    type TEXT,
    category TEXT,
    date TEXT,
    description TEXT,
    receiptUrl TEXT,
    createdBy TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    category TEXT,
    limit_amount REAL,
    period TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    title TEXT,
    amount REAL,
    dueDate TEXT,
    status TEXT,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS planning (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    name TEXT,
    amount REAL,
    group_name TEXT,
    period TEXT,
    isBought INTEGER,
    productUrl TEXT,
    storeNote TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    userId TEXT,
    userName TEXT,
    userPhoto TEXT,
    content TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id TEXT PRIMARY KEY,
    householdId TEXT,
    title TEXT,
    description TEXT,
    url TEXT,
    type TEXT,
    userId TEXT,
    userName TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS typing (
    householdId TEXT,
    userId TEXT,
    userName TEXT,
    isTyping INTEGER,
    updatedAt TEXT,
    PRIMARY KEY (householdId, userId)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    displayName TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    loginBackground TEXT,
    appBackground TEXT
  );

  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    appliedAt TEXT
  );
`);

// Robust Migration Helper
function migrate() {
  const columnExists = (table: string, column: string) => {
    try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        return info.some((c: any) => c.name === column);
    } catch (e) {
        return false;
    }
  };

  const runMigration = (name: string, sql: string) => {
    const alreadyApplied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(name);
    if (!alreadyApplied) {
      console.log(`[MIGRATION] Applying: ${name}`);
      try {
        db.prepare(sql).run();
        db.prepare("INSERT INTO _migrations (name, appliedAt) VALUES (?, ?)").run(name, new Date().toISOString());
      } catch (e: any) {
        if (e.message.includes("duplicate column name") || e.message.includes("already exists")) {
          console.warn(`[MIGRATION] Column already exists for ${name}, marking as applied.`);
          db.prepare("INSERT OR IGNORE INTO _migrations (name, appliedAt) VALUES (?, ?)").run(name, new Date().toISOString());
        } else {
          console.error(`[MIGRATION] Failed to apply ${name}:`, e.message);
        }
      }
    }
  };

  // Define migrations
  runMigration("add_email_to_users", "ALTER TABLE users ADD COLUMN email TEXT UNIQUE");
  runMigration("add_role_to_users", "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  
  // Post-migration seeding
  console.log("[DATABASE] Ensuring default admin user exists...");
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, displayName, password, role) 
    VALUES ('u_admin', 'admin', 'Administrator', 'admin', 'admin')
  `).run();
  
  db.prepare("UPDATE users SET role = 'admin' WHERE id = 'u_admin' OR username = 'admin'").run();
}

migrate();

async function startServer() {
  try {
    const app = express();
    
    // Cloudflare/Proxy Support
    app.set('trust proxy', 1);

    // Initial Database and Server Setup
    console.log(`Configuring server to listen on port: ${PORT}`);

  // Log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

    app.use(express.json({ limit: '50mb' }));
    app.use(cookieParser());
    app.use(cors({
      origin: true, // Reflect request origin
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    }));
    app.options('*', cors() as any);

  // Health check for API
  app.get("/api/ping", (req, res) => {
    res.json({ pong: true, time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // Auth Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    let token = req.cookies.token;
    
    // Fallback to Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      console.warn(`[AUTH] No token found in cookies or headers for ${req.url}`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { payload } = await jwtVerify(token, SECRET);
      req.user = payload;
      next();
    } catch (e: any) {
      console.warn(`[AUTH] Invalid token for ${req.url}:`, e.message);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- API Routes ---

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });

      let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      
      if (!user) {
        // Auto-register for now (simple setup)
        const id = "u_" + Math.random().toString(36).substring(7);
        db.prepare("INSERT INTO users (id, username, displayName, password, role) VALUES (?, ?, ?, ?, ?)")
          .run(id, username, username, password, 'user');
        user = { id, username, displayName: username, role: 'user' };
      } else {
        if (user.password !== password) {
          return res.status(401).json({ error: "Password salah. Jika Anda baru, gunakan username lain." });
        }
      }

      const { password: _, ...userWithoutPassword } = user;
      const token = await new SignJWT({ ...userWithoutPassword })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(SECRET);
      
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
      
      console.log(`[AUTH] Setting token cookie for ${username}. isHttps: ${isHttps}`);
      
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      res.json({
        ...userWithoutPassword,
        token // Send token in JSON so frontend can store in localStorage
      });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ error: "Internal Server Error: " + e.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authMiddleware, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    const users = db.prepare("SELECT id, username, displayName, email, role FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", authMiddleware, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    const { id, username, displayName, email, password, role } = req.body;
    
    if (id) {
      // Update
      db.prepare(`
        UPDATE users SET 
          username = COALESCE(?, username),
          displayName = COALESCE(?, displayName),
          email = COALESCE(?, email),
          password = COALESCE(?, password),
          role = COALESCE(?, role)
        WHERE id = ?
      `).run(username, displayName, email, password, role, id);
    } else {
      // Create
      const newId = "u_" + Math.random().toString(36).substring(7);
      db.prepare("INSERT INTO users (id, username, displayName, email, password, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run(newId, username, displayName, email, password, role || 'user');
    }
    res.json({ success: true });
  });

  app.delete("/api/admin/users/:userId", authMiddleware, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.userId);
    res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, (req: any, res) => {
    try {
      const user = db.prepare("SELECT id, username, displayName, loginBackground, appBackground FROM users WHERE id = ?").get(req.user.id) as any;
      if (!user) return res.status(401).json({ error: "User not found" });
      res.json(user);
    } catch (e: any) {
      console.error("Auth me error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/auth/settings", authMiddleware, (req: any, res) => {
    const { loginBackground, appBackground, displayName } = req.body;
    db.prepare(`
      UPDATE users SET 
        loginBackground = COALESCE(?, loginBackground),
        appBackground = COALESCE(?, appBackground),
        displayName = COALESCE(?, displayName)
      WHERE id = ?
    `).run(loginBackground, appBackground, displayName, req.user.id);
    res.json({ success: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", { path: '/' });
    res.json({ success: true });
  });

  // Households
  app.get("/api/households", authMiddleware, (req: any, res) => {
    const households = db.prepare(`
      SELECT h.* FROM households h
      JOIN members m ON h.id = m.householdId
      WHERE m.userId = ?
    `).all(req.user.id);
    res.json(households);
  });

  app.post("/api/households", authMiddleware, (req: any, res) => {
    const { name } = req.body;
    const id = "h_" + Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    db.prepare("INSERT INTO households (id, name, ownerId, createdAt) VALUES (?, ?, ?, ?)")
      .run(id, name, req.user.id, now);
    db.prepare("INSERT INTO members (householdId, userId, displayName, email, role, joinedAt) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, req.user.id, req.user.displayName, req.user.email, "owner", now);
    res.json({ id, name });
  });

  app.get("/api/households/:id/members", authMiddleware, (req, res) => {
    const members = db.prepare("SELECT * FROM members WHERE householdId = ?").all(req.params.id);
    res.json(members);
  });

  // Transactions
  app.get("/api/households/:id/transactions", authMiddleware, (req, res) => {
    const tx = db.prepare("SELECT * FROM transactions WHERE householdId = ? ORDER BY date DESC").all(req.params.id);
    res.json(tx);
  });

  app.post("/api/households/:id/transactions", authMiddleware, (req: any, res) => {
    const item = req.body;
    const id = "tx_" + Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO transactions (id, householdId, amount, type, category, date, description, receiptUrl, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, item.amount, item.type, item.category, item.date, item.description, item.receiptUrl || null, req.user.id, new Date().toISOString());
    res.json({ id, ...item });
  });

  app.delete("/api/households/:id/transactions/:txId", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ? AND householdId = ?").run(req.params.txId, req.params.id);
    res.json({ success: true });
  });

  // Budgets
  app.get("/api/households/:id/budgets", authMiddleware, (req, res) => {
    const b = db.prepare("SELECT * FROM budgets WHERE householdId = ?").all(req.params.id);
    res.json(b.map((item: any) => ({ ...item, limit: item.limit_amount })));
  });

  app.post("/api/households/:id/budgets", authMiddleware, (req, res) => {
    const { category, limit, period } = req.body;
    const id = "b_" + Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO budgets (id, householdId, category, limit_amount, period, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, category, limit, period, new Date().toISOString());
    res.json({ id, category, limit, period });
  });

  app.delete("/api/households/:id/budgets/:bId", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM budgets WHERE id = ? AND householdId = ?").run(req.params.bId, req.params.id);
    res.json({ success: true });
  });

  // Planning
  app.get("/api/households/:id/planning", authMiddleware, (req, res) => {
    const p = db.prepare("SELECT * FROM planning WHERE householdId = ? ORDER BY createdAt DESC").all(req.params.id);
    res.json(p.map((item: any) => ({ ...item, group: item.group_name, isBought: !!item.isBought })));
  });

  app.post("/api/households/:id/planning", authMiddleware, (req, res) => {
    const item = req.body;
    const id = "p_" + Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO planning (id, householdId, name, amount, group_name, period, isBought, productUrl, storeNote, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, item.name, item.amount, item.group, item.period, item.isBought ? 1 : 0, item.productUrl || null, item.storeNote || null, new Date().toISOString());
    res.json({ id, ...item });
  });

  app.patch("/api/households/:id/planning/:pId", authMiddleware, (req, res) => {
    const { isBought } = req.body;
    db.prepare("UPDATE planning SET isBought = ? WHERE id = ? AND householdId = ?").run(isBought ? 1 : 0, req.params.pId, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/households/:id/planning/:pId", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM planning WHERE id = ? AND householdId = ?").run(req.params.pId, req.params.id);
    res.json({ success: true });
  });

  // Bills
  app.get("/api/households/:id/bills", authMiddleware, (req, res) => {
    const b = db.prepare("SELECT * FROM bills WHERE householdId = ?").all(req.params.id);
    res.json(b);
  });

  app.post("/api/households/:id/bills", authMiddleware, (req, res) => {
    const item = req.body;
    const id = "bill_" + Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO bills (id, householdId, title, amount, dueDate, status, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, item.title, item.amount, item.dueDate, item.status, item.category);
    res.json({ id, ...item });
  });

  app.patch("/api/households/:id/bills/:bId", authMiddleware, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE bills SET status = ? WHERE id = ? AND householdId = ?").run(status, req.params.bId, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/households/:id/bills/:bId", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM bills WHERE id = ? AND householdId = ?").run(req.params.bId, req.params.id);
    res.json({ success: true });
  });

  // Chat
  app.get("/api/households/:id/messages", authMiddleware, (req, res) => {
    const m = db.prepare("SELECT * FROM messages WHERE householdId = ? ORDER BY timestamp ASC").all(req.params.id);
    res.json(m);
  });

  app.post("/api/households/:id/messages", authMiddleware, (req: any, res) => {
    const { content } = req.body;
    const id = "msg_" + Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO messages (id, householdId, userId, userName, content, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, req.user.displayName, content, now);
    res.json({ id, userId: req.user.id, userName: req.user.displayName, content, timestamp: now });
  });

  // Gallery
  app.get("/api/households/:id/gallery", authMiddleware, (req, res) => {
    const g = db.prepare("SELECT * FROM gallery WHERE householdId = ? ORDER BY timestamp DESC").all(req.params.id);
    res.json(g);
  });

  app.post("/api/households/:id/gallery", authMiddleware, (req: any, res) => {
    const item = req.body;
    const id = "gal_" + Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO gallery (id, householdId, title, description, url, type, userId, userName, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, item.title, item.description || null, item.url, item.type, req.user.id, req.user.displayName, now);
    res.json({ id, ...item, timestamp: now, userId: req.user.id, userName: req.user.displayName });
  });

  app.delete("/api/households/:id/gallery/:itemId", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM gallery WHERE id = ? AND householdId = ?").run(req.params.itemId, req.params.id);
    res.json({ success: true });
  });

  // Typing
  app.get("/api/households/:id/typing", authMiddleware, (req, res) => {
    const now = new Date(Date.now() - 30000).toISOString();
    const typing = db.prepare(`
      SELECT * FROM typing 
      WHERE householdId = ? AND isTyping = 1 AND updatedAt > ?
    `).all(req.params.id, now);
    res.json(typing.map((t: any) => ({ ...t, isTyping: !!t.isTyping })));
  });

  app.post("/api/households/:id/typing", authMiddleware, (req: any, res) => {
    const { isTyping } = req.body;
    db.prepare(`
      INSERT INTO typing (householdId, userId, userName, isTyping, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(householdId, userId) DO UPDATE SET
        isTyping = excluded.isTyping,
        updatedAt = excluded.updatedAt
    `).run(req.params.id, req.user.id, req.user.displayName, isTyping ? 1 : 0, new Date().toISOString());
    res.json({ success: true });
  });

  // 404 for API
  app.all("/api/*", (req: any, res) => {
    console.warn(`404 API Route: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.error("FATAL: 'dist' folder not found! Build the frontend using 'npm run build' first.");
    }
    
    // Serve static files but exclude the server bundle itself
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.cjs') || path.endsWith('.map')) {
          res.status(403).end();
        }
      }
    }));

    app.get('*', (req, res) => {
      // Don't serve HTML for API routes that missed
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server is LIVE on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Data Directory: ${DATA_DIR}`);
  });
  } catch (err: any) {
    console.error("CRITICAL ERROR:", err.message);
    process.exit(1);
  }
}

startServer();
