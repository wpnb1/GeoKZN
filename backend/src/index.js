const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { WebSocketServer } = require('ws');

const { query } = require('./db');
const { signToken, authRequired, adminRequired } = require('./auth');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const EVENT_TITLE_MAX_LENGTH = 30;
const EVENT_DESCRIPTION_MAX_LENGTH = 500;
const CHAT_SPAM_WINDOW_MS = 12 * 1000;
const CHAT_SPAM_MAX_MESSAGES = 4;
const CHAT_MUTE_MS = 40 * 1000;
const chatSpamState = new Map();

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

function getChatSpamState(userId) {
  const existing = chatSpamState.get(userId);
  if (existing) return existing;

  const created = { timestamps: [], muteUntil: 0 };
  chatSpamState.set(userId, created);
  return created;
}

function checkChatMute(userId) {
  const state = getChatSpamState(userId);
  const now = Date.now();

  if (state.muteUntil > now) {
    return { muted: true, muteUntil: state.muteUntil };
  }

  if (state.muteUntil !== 0) {
    state.muteUntil = 0;
  }

  state.timestamps = state.timestamps.filter((ts) => now - ts <= CHAT_SPAM_WINDOW_MS);
  return { muted: false, muteUntil: 0 };
}

function registerChatMessage(userId) {
  const state = getChatSpamState(userId);
  const now = Date.now();

  state.timestamps = state.timestamps.filter((ts) => now - ts <= CHAT_SPAM_WINDOW_MS);
  state.timestamps.push(now);

  if (state.timestamps.length > CHAT_SPAM_MAX_MESSAGES) {
    state.timestamps = [];
    state.muteUntil = now + CHAT_MUTE_MS;
    return { muted: true, muteUntil: state.muteUntil };
  }

  return { muted: false, muteUntil: 0 };
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connection:ready' }));
});

// ---------- Helpers ----------

async function getEventTypeIdByName(name) {
  const { rows } = await query('SELECT type_id FROM event_types WHERE name = $1', [name]);
  return rows[0]?.type_id ?? null;
}

function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

async function generateUniqueUsername(email) {
  const localPart = normalizeEmail(email).split('@')[0] ?? '';
  const base =
    localPart
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 50) || 'user';

  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? '' : `_${index}`;
    const candidate = `${base.slice(0, 50 - suffix.length)}${suffix}`;
    const { rows } = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [candidate]);
    if (rows.length === 0) {
      return candidate;
    }
  }

  return `user_${Date.now().toString().slice(-8)}`;
}

function mapUserRow(row) {
  return {
    userId: row.user_id,
    username: row.username,
    role: row.role,
    isBlocked: row.is_blocked,
    avatarEmoji: row.avatar_emoji ?? null,
    createdAt: row.created_at,
  };
}

async function getActiveUserBlock(userId) {
  const { rows } = await query(
    `SELECT block_id, unblock_at
     FROM user_blocks
     WHERE user_id = $1
       AND is_active = TRUE
     ORDER BY blocked_at DESC
     LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

async function releaseExpiredBlocksForUser(userId) {
  await query(
    `UPDATE user_blocks
     SET is_active = FALSE
     WHERE user_id = $1
       AND is_active = TRUE
       AND unblock_at IS NOT NULL
       AND unblock_at <= NOW()`,
    [userId],
  );

  await query(
    `UPDATE users u
     SET is_blocked = FALSE
     WHERE u.user_id = $1
       AND u.is_blocked = TRUE
       AND NOT EXISTS (
         SELECT 1
         FROM user_blocks ub
         WHERE ub.user_id = u.user_id
           AND ub.is_active = TRUE
       )`,
    [userId],
  );
}

async function ensureDefaultAdmin() {
  const username = 'Admin';
  const email = 'admin@geokzn.local';
  const password = '1234';

  const { rows } = await query(
    'SELECT user_id, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
    [username, email],
  );
  if (rows.length > 0) {
    if (!rows[0].email) {
      try {
        await query('UPDATE users SET email = $2 WHERE user_id = $1 AND email IS NULL', [rows[0].user_id, email]);
      } catch {
        // ignore unique-conflict edge case for demo startup
      }
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [username, email, passwordHash],
  );
  console.log('Created default admin user: admin@geokzn.local / 1234');
}

// ---------- Auth ----------

app.post('/auth/register', async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email().max(100),
    password: z.string().min(4).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const email = normalizeEmail(parsed.data.email);
  const username = await generateUniqueUsername(email);
  const { password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const role = 'user';

  try {
    const { rows } = await query(
       `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, role, is_blocked, avatar_emoji, created_at`,
      [username, email, passwordHash, role],
    );

    const user = mapUserRow(rows[0]);
    const token = signToken({ userId: user.userId, role: user.role, username: user.username });
    return res.json({ token, user });
  } catch (e) {
    return res.status(409).json({ error: 'User already exists' });
  }
});

app.post('/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().trim().email().max(100),
    password: z.string().min(1).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;
  const { rows } = await query(
    `SELECT user_id, username, role, is_blocked, avatar_emoji, created_at, password_hash
     FROM users
     WHERE LOWER(COALESCE(email, username)) = LOWER($1)
     LIMIT 1`,
    [email],
  );

  const row = rows[0];
  if (!row) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (row.is_blocked) {
    await releaseExpiredBlocksForUser(row.user_id);

    const { rows: refreshedRows } = await query(
      'SELECT user_id, username, role, is_blocked, avatar_emoji, created_at, password_hash FROM users WHERE user_id = $1',
      [row.user_id],
    );
    const refreshed = refreshedRows[0];
    if (!refreshed) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (refreshed.is_blocked) {
      const activeBlock = await getActiveUserBlock(refreshed.user_id);
      return res.status(403).json({
        error: 'User is blocked',
        unblockAt: activeBlock?.unblock_at ?? null,
        isTemporary: Boolean(activeBlock?.unblock_at),
      });
    }

    const okAfterRelease = await bcrypt.compare(password, refreshed.password_hash);
    if (!okAfterRelease) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = mapUserRow(refreshed);
    const token = signToken({ userId: user.userId, role: user.role, username: user.username });
    return res.json({ token, user });
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = mapUserRow(row);
  const token = signToken({ userId: user.userId, role: user.role, username: user.username });
  return res.json({ token, user });
});

// ---------- Profile ----------

app.get('/me', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT user_id, username, role, is_blocked, avatar_emoji, created_at
     FROM users
     WHERE user_id = $1`,
    [req.user.userId],
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: mapUserRow(row) });
});

app.patch('/me', authRequired, async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(50).optional(),
    avatarEmoji: z.string().max(16).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { username, avatarEmoji } = parsed.data;
  if (username !== undefined) {
    const uname = username.trim();
    if (!uname) return res.status(400).json({ error: 'Invalid username' });
    try {
      await query('UPDATE users SET username = $2 WHERE user_id = $1', [req.user.userId, uname]);
    } catch {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  if (avatarEmoji !== undefined) {
    const value = avatarEmoji === null ? null : String(avatarEmoji).trim();
    await query('UPDATE users SET avatar_emoji = $2 WHERE user_id = $1', [req.user.userId, value || null]);
  }

  const { rows } = await query(
    `SELECT user_id, username, role, is_blocked, avatar_emoji, created_at
     FROM users
     WHERE user_id = $1`,
    [req.user.userId],
  );
  return res.json({ user: mapUserRow(rows[0]) });
});

app.patch('/me/password', authRequired, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(4).max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { currentPassword, newPassword } = parsed.data;
  const { rows } = await query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.userId]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid current password' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $2 WHERE user_id = $1', [req.user.userId, passwordHash]);
  return res.json({ ok: true });
});

// ---------- Public data ----------

app.get('/event-types', async (_req, res) => {
  const { rows } = await query('SELECT type_id, name, icon_url, color_code, description FROM event_types ORDER BY type_id');
  return res.json({ items: rows });
});

app.get('/report-reasons', async (_req, res) => {
  const { rows } = await query('SELECT reason_id, name, description, priority FROM report_reasons ORDER BY priority DESC, reason_id');
  return res.json({ items: rows });
});

app.get('/events', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const type = req.query.type;

  // bbox=minLat,minLng,maxLat,maxLng
  const bbox = typeof req.query.bbox === 'string' ? req.query.bbox : null;
  let bboxFilter = '';
  const params = [];
  let idx = 1;

  if (bbox) {
    const parts = bbox.split(',').map((x) => Number(x));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLat, minLng, maxLat, maxLng] = parts;
      bboxFilter = `AND e.latitude BETWEEN $${idx++} AND $${idx++} AND e.longitude BETWEEN $${idx++} AND $${idx++}`;
      params.push(minLat, maxLat, minLng, maxLng);
    }
  }

  let typeFilter = '';
  if (typeof type === 'string' && type.length > 0) {
    typeFilter = `AND et.name = $${idx++}`;
    params.push(type);
  }

  const archivedFilter = includeArchived ? '' : 'AND e.is_archived = FALSE';

  const sql = `
    SELECT
      e.event_id,
      e.title,
      e.description,
      e.latitude,
      e.longitude,
      e.created_at,
      e.expires_at,
      e.is_archived,
      e.is_active,
      u.username AS author,
      et.name AS type
    FROM events e
    JOIN users u ON u.user_id = e.user_id
    JOIN event_types et ON et.type_id = e.type_id
    WHERE e.is_active = TRUE
      ${archivedFilter}
      ${bboxFilter}
      ${typeFilter}
    ORDER BY e.created_at DESC
    LIMIT 500
  `;

  const { rows } = await query(sql, params);
  return res.json({ items: rows });
});

app.get('/events/:id/comments', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const { rows } = await query(
    `SELECT c.comment_id,
            c.text AS text,
            c.created_at,
            u.username AS author
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.event_id = $1
       AND c.is_deleted = FALSE
     ORDER BY c.created_at ASC
     LIMIT 1000`,
    [id],
  );
  return res.json({ items: rows });
});

// ---------- Authenticated ----------

app.post('/events', authRequired, async (req, res) => {
  const schema = z.object({
    type: z.string().min(1).max(50),
    title: z.string().min(1).max(EVENT_TITLE_MAX_LENGTH),
    description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().max(255).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { type, title, description, latitude, longitude, address } = parsed.data;
  if (type === 'official') {
    return res.status(403).json({ error: 'Official events must be created via /admin/events' });
  }
  const typeId = await getEventTypeIdByName(type);
  if (!typeId) return res.status(400).json({ error: 'Unknown event type' });

  const { rows } = await query(
    `INSERT INTO events (user_id, type_id, title, description, latitude, longitude, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING event_id, created_at`,
    [req.user.userId, typeId, title, description ?? null, latitude, longitude, address ?? null],
  );

  broadcast({ type: 'events:changed' });
  return res.json({ eventId: rows[0].event_id, createdAt: rows[0].created_at });
});

app.post('/events/:id/comments', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const schema = z.object({
    text: z.string().min(1).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const muteState = checkChatMute(req.user.userId);
  if (muteState.muted) {
    return res.status(429).json({
      error: 'Chat temporarily muted',
      muteUntil: new Date(muteState.muteUntil).toISOString(),
    });
  }

  const spamState = registerChatMessage(req.user.userId);
  if (spamState.muted) {
    return res.status(429).json({
      error: 'Chat temporarily muted',
      muteUntil: new Date(spamState.muteUntil).toISOString(),
    });
  }

  const { rows } = await query(
    `INSERT INTO comments (user_id, event_id, text)
     VALUES ($1, $2, $3)
     RETURNING comment_id, created_at`,
    [req.user.userId, id, parsed.data.text],
  );
  broadcast({ type: 'comments:changed', eventId: id });
  return res.json({ commentId: rows[0].comment_id, createdAt: rows[0].created_at });
});

app.delete('/events/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const { rows } = await query('SELECT user_id, is_active FROM events WHERE event_id = $1', [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Event not found' });
  if (!row.is_active) return res.json({ ok: true });

  const isAdmin = req.user.role === 'admin';
  const isOwner = Number(row.user_id) === Number(req.user.userId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  // Soft-delete: hide from listings, keep DB integrity for reports/history.
  await query(
    `UPDATE events
     SET is_active = FALSE, is_archived = TRUE, archived_at = NOW()
     WHERE event_id = $1`,
    [id],
  );
  broadcast({ type: 'events:changed' });
  return res.json({ ok: true });
});

app.delete('/comments/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid comment id' });

  const { rows } = await query('SELECT user_id, event_id, is_deleted FROM comments WHERE comment_id = $1', [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Comment not found' });
  if (row.is_deleted) return res.json({ ok: true });

  const isAdmin = req.user.role === 'admin';
  const isOwner = Number(row.user_id) === Number(req.user.userId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  // Soft-delete to avoid FK issues with reports/history.
  await query('UPDATE comments SET is_deleted = TRUE, deleted_at = NOW() WHERE comment_id = $1', [id]);
  broadcast({ type: 'comments:changed', eventId: row.event_id });
  return res.json({ ok: true });
});

app.patch('/events/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const schema = z.object({
    type: z.string().min(1).max(50).optional(),
    title: z.string().min(1).max(EVENT_TITLE_MAX_LENGTH).optional(),
    description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().max(255).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { rows } = await query(
    `SELECT e.user_id, e.is_active, e.expires_at, et.name AS type
     FROM events e
     JOIN event_types et ON et.type_id = e.type_id
     WHERE e.event_id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Event not found' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = Number(row.user_id) === Number(req.user.userId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  const input = parsed.data;

  const currentType = String(row.type);
  const nextType = input.type ?? currentType;
  if (nextType === 'official' && !isAdmin) {
    return res.status(403).json({ error: 'Only admin can create or edit official events' });
  }

  const typeId = await getEventTypeIdByName(nextType);
  if (!typeId) return res.status(400).json({ error: 'Unknown event type' });

  const expiresIsSet = input.expiresAt !== undefined;
  const expiresValue = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresIsSet && nextType === 'official' && expiresValue === null) {
    return res.status(400).json({ error: 'expiresAt is required for official events' });
  }
  if (!expiresIsSet && nextType === 'official' && !row.expires_at) {
    return res.status(400).json({ error: 'expiresAt is required for official events' });
  }

  const { rows: updatedRows } = await query(
    `UPDATE events
     SET type_id = $2,
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         latitude = COALESCE($5, latitude),
         longitude = COALESCE($6, longitude),
         address = COALESCE($7, address),
         expires_at = CASE WHEN $8 THEN $9 ELSE expires_at END
     WHERE event_id = $1 AND is_active = TRUE
     RETURNING event_id`,
    [
      id,
      typeId,
      input.title ?? null,
      input.description ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.address ?? null,
      expiresIsSet,
      expiresValue,
    ],
  );

  if (updatedRows.length === 0) return res.status(404).json({ error: 'Event not found' });
  broadcast({ type: 'events:changed' });
  return res.json({ ok: true });
});

app.patch('/comments/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid comment id' });

  const schema = z.object({
    text: z.string().min(1).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { rows } = await query('SELECT user_id, event_id, is_deleted FROM comments WHERE comment_id = $1', [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Comment not found' });
  if (row.is_deleted) return res.status(404).json({ error: 'Comment not found' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = Number(row.user_id) === Number(req.user.userId);
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

  await query('UPDATE comments SET text = $2 WHERE comment_id = $1', [id, parsed.data.text]);
  broadcast({ type: 'comments:changed', eventId: row.event_id });
  return res.json({ ok: true });
});

app.post('/reports', authRequired, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Admin cannot send reports' });
  }

  const schema = z.object({
    targetType: z.enum(['event', 'comment']),
    targetId: z.number().int().positive(),
    reasonId: z.number().int().positive(),
    description: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { targetType, targetId, reasonId, description } = parsed.data;

  const eventId = targetType === 'event' ? targetId : null;
  const commentId = targetType === 'comment' ? targetId : null;

  // Can't report own content.
  if (targetType === 'event') {
    const { rows } = await query('SELECT user_id FROM events WHERE event_id = $1', [targetId]);
    const ownerId = rows[0]?.user_id;
    if (!ownerId) return res.status(404).json({ error: 'Event not found' });
    if (Number(ownerId) === Number(req.user.userId)) {
      return res.status(400).json({ error: 'Cannot report your own event' });
    }
  } else {
    const { rows } = await query('SELECT user_id, is_deleted FROM comments WHERE comment_id = $1', [targetId]);
    const ownerId = rows[0]?.user_id;
    if (!ownerId || rows[0]?.is_deleted) return res.status(404).json({ error: 'Comment not found' });
    if (Number(ownerId) === Number(req.user.userId)) {
      return res.status(400).json({ error: 'Cannot report your own comment' });
    }
  }

  await query(
    `INSERT INTO reports (reporter_id, event_id, comment_id, reason_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.userId, eventId, commentId, reasonId, description ?? null],
  );

  return res.json({ ok: true });
});

// ---------- Admin ----------

app.get('/admin/reports', authRequired, adminRequired, async (_req, res) => {
  const { rows } = await query(
    `SELECT r.report_id, r.status, r.created_at,
            r.description AS report_note,
            rr.name AS reason,
            u.username AS reporter,
            r.event_id, r.comment_id,
            COALESCE(e.user_id, c.user_id) AS target_user_id,
            COALESCE(ue.username, uc.username) AS target_username,
            e.title AS event_title,
            e.description AS event_description,
            et.name AS event_type,
            c.text AS comment_text,
            ce.event_id AS comment_event_id,
            ce.title AS comment_event_title
     FROM reports r
     JOIN report_reasons rr ON rr.reason_id = r.reason_id
     JOIN users u ON u.user_id = r.reporter_id
     LEFT JOIN events e ON e.event_id = r.event_id
     LEFT JOIN comments c ON c.comment_id = r.comment_id
     LEFT JOIN events ce ON ce.event_id = c.event_id
     LEFT JOIN event_types et ON et.type_id = e.type_id
     LEFT JOIN users ue ON ue.user_id = e.user_id
     LEFT JOIN users uc ON uc.user_id = c.user_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at DESC
     LIMIT 500`,
  );
  return res.json({ items: rows });
});

async function resolveReportAdminAction(reportId, adminUserId, nextStatus) {
  const { rows } = await query(
    `UPDATE reports
     SET status = $2, resolved_at = NOW(), resolved_by = $3
     WHERE report_id = $1 AND status = 'pending'
     RETURNING report_id, event_id, comment_id`,
    [reportId, nextStatus, adminUserId],
  );
  return rows[0] ?? null;
}

async function getReportTargetOwner(reportRow) {
  if (reportRow.event_id) {
    const { rows } = await query('SELECT user_id FROM events WHERE event_id = $1', [reportRow.event_id]);
    return rows[0]?.user_id ?? null;
  }
  if (reportRow.comment_id) {
    const { rows } = await query('SELECT user_id FROM comments WHERE comment_id = $1', [reportRow.comment_id]);
    return rows[0]?.user_id ?? null;
  }
  return null;
}

app.post('/admin/reports/:id/reject', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid report id' });

  const updated = await resolveReportAdminAction(id, req.user.userId, 'rejected');
  if (!updated) return res.status(404).json({ error: 'Report not found or already resolved' });
  return res.json({ ok: true });
});

app.post('/admin/reports/:id/delete-target', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid report id' });

  const updated = await resolveReportAdminAction(id, req.user.userId, 'approved');
  if (!updated) return res.status(404).json({ error: 'Report not found or already resolved' });

  if (updated.event_id) {
    await query(
      `UPDATE events
       SET is_active = FALSE, is_archived = TRUE, archived_at = NOW()
       WHERE event_id = $1`,
      [updated.event_id],
    );
    broadcast({ type: 'events:changed' });
  } else if (updated.comment_id) {
    // Soft-delete to avoid FK issues with reports/history.
    const { rows: commentRows } = await query('SELECT event_id FROM comments WHERE comment_id = $1', [updated.comment_id]);
    await query(
      'UPDATE comments SET is_deleted = TRUE, deleted_at = NOW() WHERE comment_id = $1',
      [updated.comment_id],
    );
    broadcast({ type: 'comments:changed', eventId: commentRows[0]?.event_id ?? null });
  }

  return res.json({ ok: true });
});

app.post('/admin/reports/:id/block-target', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid report id' });

  const updated = await resolveReportAdminAction(id, req.user.userId, 'approved');
  if (!updated) return res.status(404).json({ error: 'Report not found or already resolved' });

  const targetUserId = await getReportTargetOwner(updated);
  if (!targetUserId) return res.status(404).json({ error: 'Target not found' });

  if (Number(targetUserId) === Number(req.user.userId)) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }

  await query('UPDATE users SET is_blocked = TRUE WHERE user_id = $1', [targetUserId]);
  await query(`UPDATE user_blocks SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`, [targetUserId]);
  await query(
    `INSERT INTO user_blocks (user_id, blocked_by, reason, is_active, unblock_at)
     VALUES ($1, $2, $3, TRUE, NULL)`,
    [targetUserId, req.user.userId, `Blocked via report ${id}`],
  );

  return res.json({ ok: true });
});

// ---------- Admin users ----------

app.get('/admin/users', authRequired, adminRequired, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const params = [];
  let where = '';
  if (q) {
    where = 'WHERE username ILIKE $1';
    params.push(`%${q}%`);
  }

  const { rows } = await query(
    `SELECT user_id, username, role, is_blocked, created_at
     FROM users
     ${where}
     ORDER BY username ASC
     LIMIT 200`,
    params,
  );

  return res.json({
    items: rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      isAdmin: row.role === 'admin',
      isBlocked: row.is_blocked,
      createdAt: row.created_at,
    })),
  });
});

app.post('/admin/users/:id/block', authRequired, adminRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.status(400).json({ error: 'Invalid user id' });

  if (Number(targetId) === Number(req.user.userId)) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }

  const { rows: userRows } = await query('SELECT user_id FROM users WHERE user_id = $1', [targetId]);
  if (userRows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const schema = z.object({
    durationMinutes: z.number().int().min(0).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const minutes = parsed.data.durationMinutes;
  const unblockAt =
    minutes != null && minutes > 0 ? new Date(Date.now() + minutes * 60 * 1000) : null;

  await query('UPDATE users SET is_blocked = TRUE WHERE user_id = $1', [targetId]);
  await query(`UPDATE user_blocks SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`, [targetId]);
  await query(
    `INSERT INTO user_blocks (user_id, blocked_by, reason, is_active, unblock_at)
     VALUES ($1, $2, $3, TRUE, $4)`,
    [targetId, req.user.userId, 'Blocked by admin', unblockAt],
  );

  return res.json({ ok: true });
});

app.post('/admin/users/:id/unblock', authRequired, adminRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.status(400).json({ error: 'Invalid user id' });

  const { rows: userRows } = await query('SELECT user_id FROM users WHERE user_id = $1', [targetId]);
  if (userRows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  await query('UPDATE users SET is_blocked = FALSE WHERE user_id = $1', [targetId]);
  await query(`UPDATE user_blocks SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`, [targetId]);

  return res.json({ ok: true });
});

app.post('/admin/events/:id/archive', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  await query(
    `UPDATE events
     SET is_archived = TRUE, archived_at = NOW()
     WHERE event_id = $1`,
    [id],
  );
  broadcast({ type: 'events:changed' });
  return res.json({ ok: true });
});

app.post('/admin/events', authRequired, adminRequired, async (req, res) => {
  const schema = z.object({
    type: z.string().min(1).max(50).default('official'),
    title: z.string().min(1).max(EVENT_TITLE_MAX_LENGTH),
    description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().max(255).optional(),
    expiresAt: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { type, title, description, latitude, longitude, address, expiresAt } = parsed.data;
  if (type === 'official' && !expiresAt) {
    return res.status(400).json({ error: 'expiresAt is required for official events' });
  }
  const typeId = await getEventTypeIdByName(type);
  if (!typeId) return res.status(400).json({ error: 'Unknown event type' });

  const expires = expiresAt ? new Date(expiresAt) : null;

  const { rows } = await query(
    `INSERT INTO events (user_id, type_id, title, description, latitude, longitude, address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING event_id, created_at`,
    [req.user.userId, typeId, title, description ?? null, latitude, longitude, address ?? null, expires],
  );

  broadcast({ type: 'events:changed' });
  return res.json({ eventId: rows[0].event_id, createdAt: rows[0].created_at });
});

// Снятие временных блокировок по истечении unblock_at
async function expireBlocksTick() {
  try {
    await query(
      `UPDATE user_blocks
       SET is_active = FALSE
       WHERE is_active = TRUE
         AND unblock_at IS NOT NULL
         AND unblock_at <= NOW()`,
    );

    await query(
      `UPDATE users u
       SET is_blocked = FALSE
       WHERE u.is_blocked = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks ub
           WHERE ub.user_id = u.user_id AND ub.is_active = TRUE
         )`,
    );
  } catch (e) {
    console.error('expireBlocksTick failed', e);
  }
}

// Auto-archive: user events after 5 hours (runs on interval)
async function autoArchiveTick() {
  try {
    const userEventsResult = await query(
      `UPDATE events e
       SET is_archived = TRUE, archived_at = NOW()
       FROM event_types et
       WHERE e.type_id = et.type_id
         AND e.is_archived = FALSE
         AND e.created_at <= NOW() - INTERVAL '5 hours'
         AND et.name <> 'official'`,
    );

    const expiringEventsResult = await query(
      `UPDATE events
       SET is_archived = TRUE, archived_at = NOW()
       WHERE is_archived = FALSE
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()`,
    );

    if ((userEventsResult.rowCount ?? 0) > 0 || (expiringEventsResult.rowCount ?? 0) > 0) {
      broadcast({ type: 'events:changed' });
    }
  } catch (e) {
    // keep server alive
    console.error('autoArchiveTick failed', e);
  }
}

setInterval(expireBlocksTick, 60 * 1000);
setInterval(autoArchiveTick, 5 * 60 * 1000);

const port = Number(process.env.PORT || 4000);
async function start() {
  // DB test query + startup log (requirement)
  await query('SELECT 1');
  console.log('DB connected successfully');

  await ensureDefaultAdmin();

  server.listen(port, () => {
    console.log(`API listening on :${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
