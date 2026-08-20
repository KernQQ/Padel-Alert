const express = require("express");
const crypto = require("crypto");
const { updateStore, readStore } = require("../services/communityStore");
const { config } = require("../config/env");

const router = express.Router();
const SESSION_DAYS = config.sessionDays;

function clean(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return clean(value, 180).toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const candidate = crypto.scryptSync(String(password), user.passwordSalt, 64);
  const stored = Buffer.from(user.passwordHash, "hex");
  return stored.length === candidate.length &&
    crypto.timingSafeEqual(stored, candidate);
}

function sessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function sessionKey(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

function userRole(user) {
  if (!user) return "user";
  const email = normalizeEmail(user.email);
  if (config.adminEmails.includes(email)) return "admin";
  return ["user", "club_admin", "admin"].includes(user.role)
    ? user.role
    : "user";
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname || "",
    role: userRole(user),
    createdAt: user.createdAt
  };
}

function migrateIdentity(data, fromToken, toUserId) {
  if (!fromToken || fromToken === toUserId) return;

  if (data.profiles?.[fromToken] && !data.profiles?.[toUserId]) {
    data.profiles[toUserId] = data.profiles[fromToken];
  }
  if (data.profiles?.[fromToken]) delete data.profiles[fromToken];

  const arrays = ["posts", "requests", "notifications", "matches", "nowPlayers", "matchInvitations"];
  for (const key of arrays) {
    for (const item of data[key] || []) {
      if (item.ownerToken === fromToken) item.ownerToken = toUserId;
      if (item.requesterToken === fromToken) item.requesterToken = toUserId;
      if (item.targetOwnerToken === fromToken) item.targetOwnerToken = toUserId;

      for (const p of item.participants || []) {
        if (p.ownerToken === fromToken) p.ownerToken = toUserId;
      }
      for (const p of item.waitlist || []) {
        if (p.ownerToken === fromToken) p.ownerToken = toUserId;
      }
      if (item.readiness && Object.prototype.hasOwnProperty.call(item.readiness, fromToken)) {
        item.readiness[toUserId] = item.readiness[fromToken];
        delete item.readiness[fromToken];
      }
    }
  }
}


function cleanupSessions(data) {
  const now = Date.now();
  data.sessions ||= {};

  for (const [key, session] of Object.entries(data.sessions)) {
    const expiresAt = new Date(session.expiresAt).getTime();

    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= now
    ) {
      delete data.sessions[key];
    }
  }
}

function createSession(data, userId) {
  const token = sessionToken();
  data.sessions[sessionKey(token)] = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
  };
  return token;
}

router.post("/register", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const nickname = clean(req.body?.nickname, 40);
  const anonymousToken = clean(req.body?.anonymousToken, 100);

  if (!email.includes("@")) return res.status(400).json({ ok:false, message:"Podaj poprawny adres e-mail." });
  if (password.length < 8) return res.status(400).json({ ok:false, message:"Hasło musi mieć minimum 8 znaków." });
  if (nickname.length < 2) return res.status(400).json({ ok:false, message:"Podaj nick (minimum 2 znaki)." });

  const result = await updateStore((data) => {
    data.users ||= {};
    data.sessions ||= {};
    cleanupSessions(data);
    const exists = Object.values(data.users).some(u => u.email === email);
    if (exists) return { error:[409, "Konto z tym adresem już istnieje."] };

    const id = `usr_${crypto.randomUUID()}`;
    const pass = hashPassword(password);
    const user = {
      id, email, nickname,
      passwordSalt: pass.salt,
      passwordHash: pass.hash,
      role: config.adminEmails.includes(email) ? "admin" : "user",
      createdAt: new Date().toISOString()
    };
    data.users[id] = user;
    migrateIdentity(data, anonymousToken, id);

    data.profiles ||= {};
    data.profiles[id] = {
      ...(data.profiles[id] || {}),
      nickname,
      level: data.profiles[id]?.level || "3.0",
      preferredSide: data.profiles[id]?.preferredSide || "Dowolna",
      favoriteClubSlug: data.profiles[id]?.favoriteClubSlug || "all",
      city: data.profiles[id]?.city || "Szczecin",
      bio: data.profiles[id]?.bio || ""
    };

    return { user: publicUser(user), token:createSession(data, id) };
  });

  if (result.error) return res.status(result.error[0]).json({ok:false,message:result.error[1]});
  res.status(201).json({ok:true, ...result});
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  const result = await updateStore((data) => {
    data.users ||= {};
    data.sessions ||= {};
    cleanupSessions(data);
    const user = Object.values(data.users).find(u => u.email === email);
    if (!user || !verifyPassword(password, user)) {
      return { error:[401, "Nieprawidłowy e-mail lub hasło."] };
    }
    return { user:publicUser(user), token:createSession(data, user.id) };
  });

  if (result.error) return res.status(result.error[0]).json({ok:false,message:result.error[1]});
  res.json({ok:true, ...result});
});

router.get("/me", async (req, res) => {
  const token = clean(req.headers.authorization || "", 300).replace(/^Bearer\s+/i, "");
  const data = await readStore();
  const session =
    data.sessions?.[sessionKey(token)] ||
    data.sessions?.[token];
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return res.status(401).json({ok:false,message:"Sesja wygasła."});
  }
  const user = data.users?.[session.userId];
  if (!user) return res.status(401).json({ok:false,message:"Nie znaleziono użytkownika."});
  res.json({ok:true,user:publicUser(user), ownerToken:user.id});
});

router.post("/logout", async (req, res) => {
  const token = clean(req.headers.authorization || "", 300).replace(/^Bearer\s+/i, "");
  await updateStore(data => {
    data.sessions ||= {};
    delete data.sessions[sessionKey(token)];
    delete data.sessions[token];
  });
  res.json({ok:true});
});

module.exports = router;
