'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH'] }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/batches',  require('./routes/batches'));
app.use('/api/export',   require('./routes/export'));
app.use('/api/sync',     require('./routes/sync'));
app.use('/api/users',    require('./routes/users'));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── Serve frontend static files ───────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || '伺服器錯誤' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const sheets = require('./services/sheets');

sheets.initSheets()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🌾 野草盤點系統後端運行中`);
      console.log(`   http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('❌ 初始化失敗:', err.message);
    process.exit(1);
  });
