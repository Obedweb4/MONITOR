async function createPostgresAdapter(DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      whatsapp VARCHAR(20) DEFAULT '',
      password_hash TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      is_admin BOOLEAN DEFAULT false,
      is_superadmin BOOLEAN DEFAULT false,
      is_disabled BOOLEAN DEFAULT false,
      avatar TEXT,
      notify_down BOOLEAN DEFAULT true,
      notify_up BOOLEAN DEFAULT true,
      monitor_limit INTEGER DEFAULT 20,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      code TEXT NOT NULL,
      type VARCHAR(20) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS monitors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      url TEXT NOT NULL,
      path TEXT,
      method VARCHAR(10) DEFAULT 'GET',
      body TEXT,
      interval_mins INTEGER DEFAULT 3,
      is_active BOOLEAN DEFAULT true,
      last_status VARCHAR(10) DEFAULT 'unknown',
      last_response_time INTEGER,
      last_checked TIMESTAMPTZ,
      uptime_pct NUMERIC(5,2) DEFAULT 100,
      incident_start TIMESTAMPTZ,
      last_reminder_at TIMESTAMPTZ,
      notify_down BOOLEAN DEFAULT true,
      notify_up BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS check_history (
      id SERIAL PRIMARY KEY,
      monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
      status VARCHAR(10) NOT NULL,
      response_time INTEGER,
      error_msg TEXT,
      checked_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      whatsapp VARCHAR(30) DEFAULT '',
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix VARCHAR(20) NOT NULL,
      last_used TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_down BOOLEAN DEFAULT true`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_up BOOLEAN DEFAULT true`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS monitor_limit INTEGER DEFAULT 20`).catch(() => {});
  await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS path TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS notify_down BOOLEAN DEFAULT true`).catch(() => {});
  await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS notify_up BOOLEAN DEFAULT true`).catch(() => {});
  await pool.query(`ALTER TABLE users ALTER COLUMN whatsapp DROP NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE users ALTER COLUMN whatsapp SET DEFAULT ''`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(150)`).catch(() => {});
  await pool.query(`UPDATE users SET notify_down=true, notify_up=true WHERE notify_down IS NULL OR notify_up IS NULL`).catch(() => {});
  await pool.query(`ALTER TABLE otp_codes ALTER COLUMN code TYPE TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45)`).catch(() => {});
  await pool.query(`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS msg_status VARCHAR(20) DEFAULT 'new'`).catch(() => {});
  await pool.query(`UPDATE contact_messages SET msg_status='read' WHERE is_read=true AND msg_status='new'`).catch(() => {});
  await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS incident_start TIMESTAMPTZ`).catch(() => {});
  await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ`).catch(() => {});

  return {
    async getUserCount() {
      const r = await pool.query('SELECT COUNT(*) FROM users');
      return parseInt(r.rows[0].count);
    },
    async createUser({ username, name, email, whatsapp, passwordHash, isAdmin = false, isSuperAdmin = false, registrationIp = null }) {
      const r = await pool.query(
        'INSERT INTO users (username,name,email,whatsapp,password_hash,is_admin,is_superadmin,registration_ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [username, name, email, whatsapp, passwordHash, isAdmin, isSuperAdmin, registrationIp]
      );
      return r.rows[0];
    },
    async getUserByEmail(email) { const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]); return r.rows[0] || null; },
    async getUserByUsername(username) { const r = await pool.query('SELECT * FROM users WHERE username=$1', [username]); return r.rows[0] || null; },
    async getUserById(id) { const r = await pool.query('SELECT * FROM users WHERE id=$1', [id]); return r.rows[0] || null; },
    async getUserByRegistrationIp(ip) { const r = await pool.query('SELECT id,email FROM users WHERE registration_ip=$1 LIMIT 1', [ip]); return r.rows[0] || null; },
    async updateUser(id, fields) {
      const keys = Object.keys(fields), vals = Object.values(fields);
      const set = keys.map((k, i) => `${k}=$${i+1}`).join(', ');
      const r = await pool.query(`UPDATE users SET ${set} WHERE id=$${keys.length+1} RETURNING *`, [...vals, id]);
      return r.rows[0];
    },
    async getAllUsers({ search = '', page = 1, limit = 10 } = {}) {
      const offset = (page-1)*limit, like = `%${search}%`;
      const r = await pool.query(
        `SELECT u.id,u.username,u.name,u.email,u.whatsapp,u.is_verified,u.is_admin,u.is_superadmin,u.is_disabled,u.avatar,u.created_at,
                COALESCE(u.monitor_limit,20) AS monitor_limit,
                (SELECT COUNT(*) FROM monitors m WHERE m.user_id=u.id) AS monitor_count
         FROM users u WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR u.username ILIKE $1
         ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`, [like, limit, offset]
      );
      const cnt = await pool.query(`SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1`, [like]);
      return { users: r.rows, total: parseInt(cnt.rows[0].count) };
    },
    async getUserMonitorCount(userId) { const r = await pool.query('SELECT COUNT(*) FROM monitors WHERE user_id=$1', [userId]); return parseInt(r.rows[0].count); },
    async deleteUser(id) { await pool.query('DELETE FROM users WHERE id=$1', [id]); },

    async createOtp(email, code, type, expiresAt) {
      await pool.query('UPDATE otp_codes SET used=true WHERE email=$1 AND type=$2 AND used=false', [email, type]);
      const r = await pool.query('INSERT INTO otp_codes (email,code,type,expires_at) VALUES ($1,$2,$3,$4) RETURNING *', [email, code, type, expiresAt]);
      return r.rows[0];
    },
    async getValidOtp(email, code, type) {
      const r = await pool.query(`SELECT * FROM otp_codes WHERE email=$1 AND code=$2 AND type=$3 AND used=false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, [email, code, type]);
      return r.rows[0] || null;
    },
    async markOtpUsed(id) { await pool.query('UPDATE otp_codes SET used=true WHERE id=$1', [id]); },

    async createMonitor(userId, { name, url, path, method, body, intervalMins, notifyDown = true, notifyUp = true }) {
      const r = await pool.query(
        'INSERT INTO monitors (user_id,name,url,path,method,body,interval_mins,notify_down,notify_up) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [userId, name, url, path||null, method||'GET', body||null, intervalMins||3, notifyDown!==false, notifyUp!==false]
      );
      return r.rows[0];
    },
    async getUserMonitors(userId) { const r = await pool.query('SELECT * FROM monitors WHERE user_id=$1 ORDER BY created_at DESC', [userId]); return r.rows; },
    async getAllMonitors({ search = '', page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = {}) {
      const offset = (page-1)*limit, like = `%${search}%`;
      const SAFE_COLS = { name: 'm.name', url: 'm.url', status: 'm.last_status', uptime: 'm.uptime_pct', last_checked: 'm.last_checked', interval: 'm.interval_mins', created_at: 'm.created_at' };
      const col = SAFE_COLS[sortBy] || 'm.created_at';
      const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
      const r = await pool.query(`SELECT m.*,u.name as user_name,u.email as user_email,u.username as user_username FROM monitors m JOIN users u ON m.user_id=u.id WHERE m.name ILIKE $1 OR m.url ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1 ORDER BY ${col} ${dir} NULLS LAST LIMIT $2 OFFSET $3`, [like, limit, offset]);
      const cnt = await pool.query(`SELECT COUNT(*) FROM monitors m JOIN users u ON m.user_id=u.id WHERE m.name ILIKE $1 OR m.url ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1`, [like]);
      return { monitors: r.rows, total: parseInt(cnt.rows[0].count) };
    },
    async getMonitor(id) { const r = await pool.query('SELECT * FROM monitors WHERE id=$1', [id]); return r.rows[0]||null; },
    async updateMonitor(id, fields) {
      const keys = Object.keys(fields), vals = Object.values(fields);
      const set = keys.map((k,i) => `${k}=$${i+1}`).join(', ');
      const r = await pool.query(`UPDATE monitors SET ${set} WHERE id=$${keys.length+1} RETURNING *`, [...vals, id]);
      return r.rows[0];
    },
    async deleteMonitor(id) { await pool.query('DELETE FROM monitors WHERE id=$1', [id]); },
    async getAllActiveMonitors() {
      const r = await pool.query(`SELECT m.*,u.name as user_name,u.email as user_email FROM monitors m JOIN users u ON m.user_id=u.id WHERE m.is_active=true`);
      return r.rows;
    },
    async addCheckHistory(monitorId, status, responseTime, errorMsg) {
      await pool.query('INSERT INTO check_history (monitor_id,status,response_time,error_msg) VALUES ($1,$2,$3,$4)', [monitorId, status, responseTime||null, errorMsg||null]);
      const count = await pool.query('SELECT COUNT(*) FROM check_history WHERE monitor_id=$1', [monitorId]);
      if (parseInt(count.rows[0].count) > 60)
        await pool.query(`DELETE FROM check_history WHERE id IN (SELECT id FROM check_history WHERE monitor_id=$1 ORDER BY checked_at ASC LIMIT 10)`, [monitorId]);
      const stats = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='up' THEN 1 ELSE 0 END) as up_count FROM check_history WHERE monitor_id=$1`, [monitorId]);
      const { total, up_count } = stats.rows[0];
      const uptime = total > 0 ? Math.round((up_count/total)*1000)/10 : 100;
      await pool.query('UPDATE monitors SET uptime_pct=$1 WHERE id=$2', [uptime, monitorId]);
    },
    async getMonitorHistory(monitorId, limit = 30) {
      const r = await pool.query('SELECT * FROM check_history WHERE monitor_id=$1 ORDER BY checked_at DESC LIMIT $2', [monitorId, limit]);
      return r.rows.reverse();
    },
    async saveContactMessage({ name, email, whatsapp, subject, message }) {
      const r = await pool.query('INSERT INTO contact_messages (name,email,whatsapp,subject,message) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name, email, whatsapp||'', subject, message]);
      return r.rows[0];
    },
    async getContactMessages({ page = 1, limit = 10, tab = 'new' } = {}) {
      const offset = (page-1)*limit;
      const safeTab = ['new','read','draft'].includes(tab) ? tab : 'new';
      const r = await pool.query('SELECT * FROM contact_messages WHERE msg_status=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [safeTab, limit, offset]);
      const cnt = await pool.query('SELECT COUNT(*) FROM contact_messages WHERE msg_status=$1', [safeTab]);
      const allCounts = await pool.query(`SELECT msg_status, COUNT(*) as c FROM contact_messages GROUP BY msg_status`);
      const counts = { new: 0, read: 0, draft: 0 };
      for (const row of allCounts.rows) { if (counts.hasOwnProperty(row.msg_status)) counts[row.msg_status] = parseInt(row.c); }
      return { messages: r.rows, total: parseInt(cnt.rows[0].count), counts };
    },
    async markContactRead(id) { await pool.query("UPDATE contact_messages SET is_read=true, msg_status='read' WHERE id=$1", [id]); },
    async markContactDraft(id) { await pool.query("UPDATE contact_messages SET is_read=true, msg_status='draft' WHERE id=$1", [id]); },
    async markContactNew(id) { await pool.query("UPDATE contact_messages SET is_read=false, msg_status='new' WHERE id=$1", [id]); },
    async deleteContactMessage(id) { await pool.query('DELETE FROM contact_messages WHERE id=$1', [id]); },

    async createApiKey(userId, name, keyHash, keyPrefix) {
      const r = await pool.query(
        'INSERT INTO api_keys (user_id,name,key_hash,key_prefix) VALUES ($1,$2,$3,$4) RETURNING *',
        [userId, name, keyHash, keyPrefix]
      );
      return r.rows[0];
    },
    async getUserApiKeys(userId) {
      const r = await pool.query('SELECT id,name,key_prefix,last_used,is_active,created_at FROM api_keys WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC', [userId]);
      return r.rows;
    },
    async getApiKeyByHash(keyHash) {
      const r = await pool.query('SELECT * FROM api_keys WHERE key_hash=$1 AND is_active=true', [keyHash]);
      return r.rows[0] || null;
    },
    async revokeApiKey(id, userId) {
      await pool.query('UPDATE api_keys SET is_active=false WHERE id=$1 AND user_id=$2', [id, userId]);
    },
    async deleteApiKey(id, userId) {
      await pool.query('DELETE FROM api_keys WHERE id=$1 AND user_id=$2', [id, userId]);
    },
    async updateApiKeyLastUsed(id) {
      await pool.query('UPDATE api_keys SET last_used=NOW() WHERE id=$1', [id]);
    },
  };
}

module.exports = { createPostgresAdapter };
