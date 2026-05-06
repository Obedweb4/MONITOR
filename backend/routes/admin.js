const router = require("express").Router();
const { getDB } = require("../lib/db");
const { requireAuth, requireAdmin, sanitize, hashPassword, comparePassword } = require("../lib/auth");
const { pingMonitor } = require("../lib/ping");
const { TIMEZONE } = require("../config");

router.use(requireAuth, requireAdmin);

// ─── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const db = getDB();
    const [{ users }, { monitors, total: totalMonitors }] = await Promise.all([
      db.getAllUsers({ limit: 99999 }),
      db.getAllMonitors({ limit: 99999 }),
    ]);
    const up   = monitors.filter(m => m.last_status === "up").length;
    const down = monitors.filter(m => m.last_status === "down").length;
    res.json({ totalUsers: users.length, totalMonitors, monitorsUp: up, monitorsDown: down, timezone: TIMEZONE });
  } catch { res.status(500).json({ error: "Failed to load stats" }); }
});

// ─── Users ───────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const search = sanitize(req.query.search || "");
    res.json(await getDB().getAllUsers({ search, page, limit }));
  } catch { res.status(500).json({ error: "Failed to load users" }); }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await getDB().getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password_hash, ...safe } = user;
    res.json(safe);
  } catch { res.status(500).json({ error: "Failed to load user" }); }
});

router.get("/users/:id/monitors", async (req, res) => {
  try {
    const monitors = await getDB().getUserMonitors(req.params.id);
    res.json({ monitors });
  } catch { res.status(500).json({ error: "Failed to load user monitors" }); }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const db = getDB();
    const targetId = req.params.id;
    const selfId = req.userId;
    if (String(targetId) === String(selfId)) return res.status(400).json({ error: "You cannot modify your own account here" });

    const { is_admin, is_disabled, monitor_limit, name, email, username, whatsapp, avatar } = req.body;
    const updates = {};
    if (is_admin      !== undefined) updates.is_admin      = !!is_admin;
    if (is_disabled   !== undefined) updates.is_disabled   = !!is_disabled;
    if (monitor_limit !== undefined) updates.monitor_limit = Math.max(0, parseInt(monitor_limit) || 20);
    if (name          !== undefined && String(name).trim())     updates.name     = String(name).trim();
    if (email         !== undefined && String(email).trim())    updates.email    = String(email).trim().toLowerCase();
    if (username      !== undefined && String(username).trim()) updates.username = String(username).trim().toLowerCase();
    if (whatsapp      !== undefined) updates.whatsapp      = String(whatsapp || '').trim();
    if (avatar        !== undefined) updates.avatar        = avatar || null;
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No fields to update" });

    const target = await db.getUserById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.is_superadmin && !req.isSuperAdmin) return res.status(403).json({ error: "Only superadmins can modify other superadmins" });
    if (target.is_admin && !req.isSuperAdmin) return res.status(403).json({ error: "Only superadmins can modify admin accounts" });

    const user = await db.updateUser(targetId, updates);
    const { password_hash, ...safe } = user;
    res.json(safe);
  } catch (e) {
    const msg = e?.message || "";
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("already")) {
      return res.status(400).json({ error: "Email or username already in use" });
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const db = getDB();
    const targetId = req.params.id;
    if (String(targetId) === String(req.userId))
      return res.status(400).json({ error: "Use the regular change-password flow for your own account" });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: "New password must be at least 8 characters" });

    const target = await db.getUserById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.is_superadmin && !req.isSuperAdmin)
      return res.status(403).json({ error: "Only the superadmin can reset another superadmin's password" });
    if (target.is_admin && !req.isSuperAdmin)
      return res.status(403).json({ error: "Only superadmins can reset an admin's password" });

    const password_hash = await hashPassword(newPassword);
    await db.updateUser(targetId, { password_hash });
    res.json({ message: "Password reset successfully" });
  } catch { res.status(500).json({ error: "Failed to reset password" }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const db = getDB();
    const targetId = req.params.id;
    const selfId = req.userId;
    if (String(targetId) === String(selfId)) return res.status(400).json({ error: "You cannot delete your own account" });

    const target = await db.getUserById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.is_superadmin) return res.status(403).json({ error: "Cannot delete a superadmin account" });
    if (target.is_admin && !req.isSuperAdmin) return res.status(403).json({ error: "Only superadmins can delete admin accounts" });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password is required to delete a user" });
    const self = await db.getUserById(selfId);
    if (!self || !(await comparePassword(password, self.password_hash)))
      return res.status(400).json({ error: "Incorrect password. Deletion cancelled." });

    await db.deleteUser(targetId);
    res.json({ message: "User deleted" });
  } catch { res.status(500).json({ error: "Failed to delete user" }); }
});

// ─── Admin Monitors ───────────────────────────────────────────────────────────
router.get("/monitors", async (req, res) => {
  try {
    const db = getDB();
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search  = sanitize(req.query.search || "");
    const SAFE_SORT = ["name","url","status","uptime","last_checked","interval","created_at"];
    const sortBy  = SAFE_SORT.includes(req.query.sortBy) ? req.query.sortBy : "created_at";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const { monitors, total } = await db.getAllMonitors({ search, page, limit, sortBy, sortDir });
    const result = await Promise.all(monitors.map(async m => ({ ...m, history: await db.getMonitorHistory(m.id, 30) })));
    res.json({ monitors: result, total, page, limit });
  } catch { res.status(500).json({ error: "Failed to load monitors" }); }
});

router.get("/monitors/:id", async (req, res) => {
  try {
    const db = getDB();
    const monitor = await db.getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: "Monitor not found" });
    const [history, owner] = await Promise.all([
      db.getMonitorHistory(monitor.id, 60),
      db.getUserById(monitor.user_id).catch(() => null),
    ]);
    res.json({ ...monitor, history, user_name: owner?.name, user_username: owner?.username, user_email: owner?.email, user_whatsapp: owner?.whatsapp });
  } catch { res.status(500).json({ error: "Failed to load monitor" }); }
});

router.put("/monitors/:id", async (req, res) => {
  try {
    const db = getDB();
    const { name, url, path, method, body, intervalMins, is_active, notify_down, notify_up } = req.body;
    const updates = {};
    if (name         !== undefined) updates.name          = sanitize(name);
    if (url          !== undefined) updates.url           = sanitize(url);
    if (path         !== undefined) updates.path          = path ? sanitize(path) : null;
    if (method       !== undefined) updates.method        = sanitize(method).toUpperCase();
    if (body         !== undefined) updates.body          = sanitize(body);
    if (intervalMins !== undefined) updates.interval_mins = parseFloat(intervalMins);
    if (is_active    !== undefined) updates.is_active     = is_active;
    if (notify_down  !== undefined) updates.notify_down   = notify_down !== false && notify_down !== 'false';
    if (notify_up    !== undefined) updates.notify_up     = notify_up   !== false && notify_up   !== 'false';
    res.json(await db.updateMonitor(req.params.id, updates));
  } catch { res.status(500).json({ error: "Failed to update monitor" }); }
});

router.post("/users/bulk", async (req, res) => {
  try {
    const db = getDB();
    const { action, ids, password } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "action and ids are required" });
    if (action === "delete") {
      if (!password) return res.status(400).json({ error: "Password is required" });
      const self = await db.getUserById(req.userId);
      if (!self || !(await comparePassword(password, self.password_hash)))
        return res.status(400).json({ error: "Incorrect password" });
    }
    let success = 0, skipped = 0;
    for (const id of ids) {
      try {
        const target = await db.getUserById(String(id));
        if (!target) { skipped++; continue; }
        if (target.is_superadmin) { skipped++; continue; }
        if (target.is_admin && !req.isSuperAdmin) { skipped++; continue; }
        if (action === "disable") {
          await db.updateUser(String(id), { is_disabled: true });
        } else if (action === "enable") {
          await db.updateUser(String(id), { is_disabled: false });
        } else if (action === "delete") {
          await db.deleteUser(String(id));
        } else { skipped++; continue; }
        success++;
      } catch { skipped++; }
    }
    res.json({ success, skipped });
  } catch { res.status(500).json({ error: "Bulk action failed" }); }
});

router.post("/monitors/bulk", async (req, res) => {
  try {
    const db = getDB();
    const { action, ids, password, intervalMins } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "action and ids are required" });
    if (action === "delete") {
      if (!password) return res.status(400).json({ error: "Password is required" });
      const self = await db.getUserById(req.userId);
      if (!self || !(await comparePassword(password, self.password_hash)))
        return res.status(400).json({ error: "Incorrect password" });
    }
    let success = 0, skipped = 0;
    for (const id of ids) {
      try {
        if (action === "pause")    await db.updateMonitor(String(id), { is_active: false });
        else if (action === "activate") await db.updateMonitor(String(id), { is_active: true });
        else if (action === "interval") {
          const mins = parseInt(intervalMins);
          if (!mins || mins < 1) { skipped++; continue; }
          await db.updateMonitor(String(id), { interval_mins: mins });
        } else if (action === "delete") await db.deleteMonitor(String(id));
        else { skipped++; continue; }
        success++;
      } catch { skipped++; }
    }
    res.json({ success, skipped });
  } catch { res.status(500).json({ error: "Bulk action failed" }); }
});

router.delete("/monitors/:id", async (req, res) => {
  try {
    const db = getDB();
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password is required to delete a monitor" });
    const self = await db.getUserById(req.userId);
    if (!self || !(await comparePassword(password, self.password_hash)))
      return res.status(400).json({ error: "Incorrect password. Deletion cancelled." });
    await db.deleteMonitor(req.params.id);
    res.json({ message: "Monitor deleted" });
  } catch { res.status(500).json({ error: "Failed to delete monitor" }); }
});

router.post("/monitors/:id/ping", async (req, res) => {
  try {
    const monitor = await getDB().getMonitor(req.params.id);
    if (!monitor) return res.status(404).json({ error: "Monitor not found" });
    pingMonitor(monitor);
    res.json({ message: "Ping triggered" });
  } catch { res.status(500).json({ error: "Failed to ping" }); }
});

// ─── Contact Messages ─────────────────────────────────────────────────────────
router.get("/contact", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const tab   = ["new","read","draft"].includes(req.query.tab) ? req.query.tab : "new";
    res.json(await getDB().getContactMessages({ page, limit: 10, tab }));
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

router.patch("/contact/:id/read", async (req, res) => {
  try { await getDB().markContactRead(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: "Failed to update message" }); }
});

router.patch("/contact/:id/draft", async (req, res) => {
  try { await getDB().markContactDraft(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: "Failed to update message" }); }
});

router.patch("/contact/:id/new", async (req, res) => {
  try { await getDB().markContactNew(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: "Failed to update message" }); }
});

router.post("/contact/bulk", async (req, res) => {
  try {
    const db = getDB();
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "action and ids are required" });
    let success = 0, skipped = 0;
    for (const id of ids) {
      try {
        if (action === "read")   await db.markContactRead(String(id));
        else if (action === "draft")  await db.markContactDraft(String(id));
        else if (action === "new")    await db.markContactNew(String(id));
        else if (action === "delete") await db.deleteContactMessage(String(id));
        else { skipped++; continue; }
        success++;
      } catch { skipped++; }
    }
    res.json({ success, skipped });
  } catch { res.status(500).json({ error: "Bulk action failed" }); }
});

router.delete("/contact/:id", async (req, res) => {
  try { await getDB().deleteContactMessage(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: "Failed to delete message" }); }
});

module.exports = router;
