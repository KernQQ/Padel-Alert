const express = require("express");
const { randomUUID } = require("crypto");

const router = express.Router();

// Wersja lokalna: ogłoszenia istnieją do restartu backendu.
// Później ten moduł można podłączyć do bazy danych.
let partnerPosts = [];

function sanitizeText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

router.get("/", (req, res) => {
  const { clubSlug, date } = req.query;
  let results = [...partnerPosts];

  if (clubSlug && clubSlug !== "all") {
    results = results.filter((post) => post.clubSlug === clubSlug);
  }

  if (date) {
    results = results.filter((post) => post.date === date);
  }

  results.sort((a, b) => {
    const first = `${a.date}T${a.from}`;
    const second = `${b.date}T${b.from}`;
    return first.localeCompare(second);
  });

  res.json({
    ok: true,
    count: results.length,
    posts: results
  });
});

router.post("/", (req, res) => {
  const {
    nickname,
    contact,
    clubSlug,
    clubName,
    date,
    from,
    to,
    level,
    playersNeeded,
    note
  } = req.body || {};

  if (!nickname || !contact || !clubSlug || !date || !from || !to) {
    return res.status(400).json({
      ok: false,
      message:
        "Uzupełnij pseudonim, kontakt, klub, datę oraz godziny."
    });
  }

  const post = {
    id: randomUUID(),
    nickname: sanitizeText(nickname, 50),
    contact: sanitizeText(contact, 120),
    clubSlug: sanitizeText(clubSlug, 80),
    clubName: sanitizeText(clubName, 100),
    date: sanitizeText(date, 10),
    from: sanitizeText(from, 5),
    to: sanitizeText(to, 5),
    level: sanitizeText(level || "Dowolny", 30),
    playersNeeded: Math.max(
      1,
      Math.min(3, Number(playersNeeded) || 1)
    ),
    note: sanitizeText(note, 250),
    createdAt: new Date().toISOString()
  };

  partnerPosts.push(post);

  res.status(201).json({
    ok: true,
    post
  });
});

router.delete("/:id", (req, res) => {
  const before = partnerPosts.length;
  partnerPosts = partnerPosts.filter(
    (post) => post.id !== req.params.id
  );

  if (partnerPosts.length === before) {
    return res.status(404).json({
      ok: false,
      message: "Nie znaleziono ogłoszenia."
    });
  }

  res.json({
    ok: true
  });
});

module.exports = router;
