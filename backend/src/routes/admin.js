const express = require("express");
const crypto = require("crypto");
const { readStore, updateStore } = require("../services/communityStore");
const { config } = require("../config/env");
const { broadcast } = require("../services/realtimeHub");

const router = express.Router();

function clean(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return clean(value, 180).toLowerCase();
}

function sessionKey(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function effectiveRole(user) {
  if (!user) return "user";
  if (config.adminEmails.includes(normalizeEmail(user.email))) return "admin";
  return ["user", "club_admin", "admin"].includes(user.role) ? user.role : "user";
}

async function requireAdmin(req, res, next) {
  const raw = clean(req.headers.authorization || "", 400).replace(/^Bearer\s+/i, "");
  if (!raw) return res.status(401).json({ ok: false, message: "Zaloguj się jako administrator." });

  const data = await readStore();
  const session = data.sessions?.[sessionKey(raw)] || data.sessions?.[raw];
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return res.status(401).json({ ok: false, message: "Sesja administratora wygasła." });
  }

  const user = data.users?.[session.userId];
  if (!user || effectiveRole(user) !== "admin") {
    return res.status(403).json({ ok: false, message: "Brak uprawnień administratora." });
  }

  req.adminUser = user;
  next();
}

router.use(requireAdmin);

router.get("/summary", async (req, res) => {
  const data = await readStore();
  res.json({
    ok: true,
    summary: {
      users: Object.keys(data.users || {}).length,
      matches: (data.matches || []).length,
      activeMatches: (data.matches || []).filter((m) => !["completed", "cancelled"].includes(m.status)).length,
      playersLooking: (data.posts || []).length,
      notifications: (data.notifications || []).length
    }
  });
});

router.get("/users", async (req, res) => {
  const data = await readStore();
  const users = Object.values(data.users || {}).map((user) => ({
    id: user.id,
    email: user.email,
    nickname: user.nickname || data.profiles?.[user.id]?.nickname || "",
    role: effectiveRole(user),
    createdAt: user.createdAt,
    level: data.profiles?.[user.id]?.level || "3.0",
    city: data.profiles?.[user.id]?.city || "Szczecin"
  })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  res.json({ ok: true, users });
});

router.patch("/users/:id", async (req, res) => {
  const role = clean(req.body?.role, 30);
  if (!['user', 'club_admin', 'admin'].includes(role)) {
    return res.status(400).json({ ok: false, message: "Nieprawidłowa rola." });
  }

  const result = await updateStore((data) => {
    const user = data.users?.[req.params.id];
    if (!user) return { error: [404, "Nie znaleziono użytkownika."] };

    if (config.adminEmails.includes(normalizeEmail(user.email)) && role !== "admin") {
      return { error: [400, "Administrator z ADMIN_EMAILS nie może stracić roli admina tutaj."] };
    }

    user.role = role;
    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname || "",
        role: effectiveRole(user),
        createdAt: user.createdAt
      }
    };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  res.json({ ok: true, user: result.user });
});

function adminMatch(data, match) {
  const owner = data.users?.[match.ownerToken];
  return {
    ...match,
    owner: owner ? {
      id: owner.id,
      email: owner.email,
      nickname: owner.nickname || data.profiles?.[owner.id]?.nickname || "Organizator"
    } : {
      id: match.ownerToken,
      email: "",
      nickname: data.profiles?.[match.ownerToken]?.nickname || "Organizator"
    },
    participants: (match.participants || []).map((p) => ({
      ...p,
      profile: data.profiles?.[p.ownerToken] || null
    })),
    waitlist: match.waitlist || []
  };
}

router.get("/matches", async (req, res) => {
  const data = await readStore();
  const matches = (data.matches || [])
    .map((match) => adminMatch(data, match))
    .sort((a, b) => `${b.date}T${b.from}`.localeCompare(`${a.date}T${a.from}`));

  res.json({ ok: true, matches });
});

router.patch("/matches/:id", async (req, res) => {
  const allowed = [
    "clubSlug", "clubName", "date", "from", "to", "level", "gameType",
    "note", "courtId", "courtName", "courtType", "reservationUrl", "status", "maxPlayers"
  ];

  const result = await updateStore((data) => {
    const match = (data.matches || []).find((item) => item.id === req.params.id);
    if (!match) return { error: [404, "Nie znaleziono meczu."] };

    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) continue;
      if (key === "maxPlayers") {
        match.maxPlayers = Math.max(2, Math.min(8, Number(req.body[key]) || 4));
      } else if (key === "status") {
        const status = clean(req.body[key], 20);
        if (!["open", "full", "confirmed", "completed", "cancelled"].includes(status)) {
          return { error: [400, "Nieprawidłowy status meczu."] };
        }
        match.status = status;
      } else {
        const max = key === "note" ? 300 : key === "reservationUrl" ? 500 : ["from", "to"].includes(key) ? 5 : key === "date" ? 10 : 120;
        match[key] = clean(req.body[key], max);
      }
    }

    if (!match.clubSlug || !match.date || !match.from || !match.to) {
      return { error: [400, "Klub, data i godziny są wymagane."] };
    }
    if (match.from >= match.to) {
      return { error: [400, "Godzina końcowa musi być późniejsza."] };
    }

    match.updatedAt = new Date().toISOString();
    return { match: adminMatch(data, match) };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  broadcast("matches.changed", { method: "ADMIN_PATCH", matchId: req.params.id });
  res.json({ ok: true, match: result.match });
});

router.delete("/matches/:id/participants/:participantKey", async (req, res) => {
  const result = await updateStore((data) => {
    const match = (data.matches || []).find((item) => item.id === req.params.id);
    if (!match) return { error: [404, "Nie znaleziono meczu."] };

    const participant = (match.participants || []).find((item) => item.joinedAt === req.params.participantKey);
    if (!participant) return { error: [404, "Nie znaleziono gracza w składzie."] };
    if (participant.ownerToken === match.ownerToken) {
      return { error: [400, "Nie można usunąć organizatora. Najpierw usuń albo edytuj cały mecz."] };
    }

    match.participants = (match.participants || []).filter((item) => item.joinedAt !== req.params.participantKey);
    match.readiness ||= {};
    delete match.readiness[participant.ownerToken];
    match.status = match.participants.length >= Number(match.maxPlayers || 4) ? "full" : "open";
    match.updatedAt = new Date().toISOString();
    return { match: adminMatch(data, match) };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  broadcast("matches.changed", { method: "ADMIN_REMOVE_PARTICIPANT", matchId: req.params.id });
  res.json({ ok: true, match: result.match });
});

router.delete("/matches/:id", async (req, res) => {
  const result = await updateStore((data) => {
    const index = (data.matches || []).findIndex((item) => item.id === req.params.id);
    if (index < 0) return { error: [404, "Nie znaleziono meczu."] };

    data.matches.splice(index, 1);
    data.matchInvitations = (data.matchInvitations || []).filter((invitation) => invitation.matchId !== req.params.id);
    return { ok: true };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  broadcast("matches.changed", { method: "ADMIN_DELETE", matchId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
