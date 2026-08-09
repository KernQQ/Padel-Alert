const express = require("express");
const bo5Service = require("../services/bo5Service");
const { readStore } = require("../services/communityStore");

const router = express.Router();

function minutes(value = "00:00") {
  const [h, m] = String(value).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function timeFromMinutes(total) {
  const normalized = Math.max(0, total);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aFrom, aTo, bFrom, bTo) {
  return minutes(aFrom) < minutes(bTo) && minutes(bFrom) < minutes(aTo);
}

function covers(postFrom, postTo, windowFrom, windowTo) {
  return minutes(postFrom) <= minutes(windowFrom) &&
    minutes(postTo) >= minutes(windowTo);
}

function numericLevel(value) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getProfiles(data) {
  return Object.values(data.profiles || {});
}

function profileFor(data, ownerToken) {
  return (
    (data.profiles || {})[ownerToken] ||
    getProfiles(data).find(
      (profile) =>
        profile.id === ownerToken ||
        profile.ownerToken === ownerToken
    ) ||
    null
  );
}

function scoreCandidate({
  myLevel,
  playerLevel,
  clubSlug,
  postClubSlug,
  overlapMinutes,
  playNow
}) {
  const difference =
    myLevel !== null && playerLevel !== null
      ? Math.abs(myLevel - playerLevel)
      : 0.5;

  let score = 100;
  score -= Math.min(48, difference * 72);
  score += Math.min(24, overlapMinutes / 8);

  if (
    clubSlug &&
    (postClubSlug === clubSlug || postClubSlug === "all")
  ) {
    score += 12;
  }

  if (playNow) score += 6;

  return Math.max(35, Math.min(99, Math.round(score)));
}

function buildCandidates(data, ownerToken, filters) {
  const { date, from, to, clubSlug } = filters;
  const me = profileFor(data, ownerToken);
  const myLevel = numericLevel(me?.level);

  return (data.posts || [])
    .filter((post) => post.ownerToken !== ownerToken)
    .filter((post) => post.status === "open")
    .filter((post) => !date || post.date === date)
    .filter(
      (post) =>
        !clubSlug ||
        post.clubSlug === "all" ||
        post.clubSlug === clubSlug
    )
    .filter((post) =>
      overlaps(
        post.from || "00:00",
        post.to || "23:59",
        from,
        to
      )
    )
    .map((post) => {
      const profile = profileFor(data, post.ownerToken);
      const level = numericLevel(post.level || profile?.level);
      const overlapStart = Math.max(
        minutes(from),
        minutes(post.from || from)
      );
      const overlapEnd = Math.min(
        minutes(to),
        minutes(post.to || to)
      );
      const overlapMinutes = Math.max(0, overlapEnd - overlapStart);

      return {
        postId: post.id,
        ownerToken: post.ownerToken,
        nickname:
          profile?.nickname ||
          post.nickname ||
          "Gracz",
        level:
          post.level ||
          profile?.level ||
          "3.0",
        preferredSide:
          profile?.preferredSide ||
          post.preferredSide ||
          "Dowolna",
        clubSlug:
          post.clubSlug ||
          profile?.favoriteClubSlug ||
          "all",
        clubName:
          post.clubName ||
          "Dowolny klub",
        date: post.date,
        from: post.from,
        to: post.to,
        note: post.note || "",
        flexibleHours: Boolean(post.flexibleHours),
        overlapMinutes,
        score: scoreCandidate({
          myLevel,
          playerLevel: level,
          clubSlug,
          postClubSlug: post.clubSlug,
          overlapMinutes,
          playNow: false
        })
      };
    })
    .sort((a, b) => b.score - a.score);
}

function consecutiveWindows(slots, duration) {
  const requiredBlocks = Math.max(1, Math.ceil(duration / 30));
  const groups = new Map();

  for (const slot of slots) {
    const key = `${slot.clubSlug}|${slot.courtId}|${slot.date}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(slot);
  }

  const windows = [];

  for (const groupSlots of groups.values()) {
    groupSlots.sort((a, b) => a.hour.localeCompare(b.hour));

    const hourMap = new Map(
      groupSlots.map((slot) => [slot.hour, slot])
    );

    for (const slot of groupSlots) {
      const start = minutes(slot.hour);
      let ok = true;

      for (let block = 0; block < requiredBlocks; block += 1) {
        const hour = timeFromMinutes(start + block * 30);

        if (!hourMap.has(hour)) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      windows.push({
        clubId: slot.clubId,
        clubSlug: slot.clubSlug,
        clubName: slot.clubName,
        courtId: slot.courtId,
        courtName: slot.courtName,
        courtType: slot.courtType || "indoor",
        date: slot.date,
        from: slot.hour,
        to: timeFromMinutes(start + duration),
        duration,
        reservationUrl: slot.reservationUrl
      });
    }
  }

  return windows;
}

router.get("/suggestions", async (req, res) => {
  const ownerToken = String(
    req.headers["x-owner-token"] || ""
  ).trim();

  const filters = {
    date: String(req.query.date || "").trim(),
    from: String(req.query.from || "06:00").trim(),
    to: String(req.query.to || "23:30").trim(),
    clubSlug: String(req.query.clubSlug || "").trim()
  };

  const data = await readStore();
  const me = profileFor(data, ownerToken);

  res.json({
    ok: true,
    query: filters,
    myLevel: numericLevel(me?.level),
    candidates: buildCandidates(data, ownerToken, filters).slice(0, 16)
  });
});

router.get("/ready", async (req, res) => {
  try {
    const ownerToken = String(
      req.headers["x-owner-token"] || ""
    ).trim();

    const date = String(req.query.date || "").trim();
    const from = String(req.query.from || "06:00").trim();
    const to = String(req.query.to || "23:30").trim();
    const clubSlug = String(req.query.clubSlug || "").trim();
    const duration = Math.max(
      60,
      Math.min(120, Number(req.query.duration) || 90)
    );

    const data = await readStore();
    const candidates = buildCandidates(data, ownerToken, {
      date,
      from,
      to,
      clubSlug
    });

    const availability = clubSlug
      ? await bo5Service.getAvailability(clubSlug)
      : await bo5Service.getAllAvailability();

    const allSlots = availability.slots || [];

    const filteredSlots = allSlots.filter((slot) => {
      if (date && slot.date !== date) return false;
      if (clubSlug && slot.clubSlug !== clubSlug) return false;
      if (slot.hour < from || slot.hour >= to) return false;
      return true;
    });

    const windows = consecutiveWindows(filteredSlots, duration)
      .filter((window) => window.to <= to);

    const readyMatches = windows
      .map((window) => {
        const matchingPlayers = candidates
          .filter((player) => {
            const clubOk =
              player.clubSlug === "all" ||
              player.clubSlug === window.clubSlug;

            const hoursOk =
              player.flexibleHours
                ? overlaps(
                    player.from,
                    player.to,
                    window.from,
                    window.to
                  )
                : covers(
                    player.from,
                    player.to,
                    window.from,
                    window.to
                  );

            return clubOk && hoursOk;
          })
          .map((player) => ({
            ...player,
            score: Math.min(
              99,
              player.score +
                (player.clubSlug === window.clubSlug ? 5 : 0)
            )
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const averageScore =
          matchingPlayers.length > 0
            ? Math.round(
                matchingPlayers.reduce(
                  (sum, player) => sum + player.score,
                  0
                ) / matchingPlayers.length
              )
            : 0;

        const completeness = matchingPlayers.length / 3;
        const readyScore = Math.round(
          averageScore * 0.72 + completeness * 28
        );

        return {
          ...window,
          players: matchingPlayers,
          playersFound: matchingPlayers.length,
          playersNeeded: Math.max(0, 3 - matchingPlayers.length),
          readyScore
        };
      })
      .sort((a, b) => {
        if (b.playersFound !== a.playersFound) {
          return b.playersFound - a.playersFound;
        }

        if (b.readyScore !== a.readyScore) {
          return b.readyScore - a.readyScore;
        }

        return a.from.localeCompare(b.from);
      })
      .slice(0, 8);

    res.json({
      ok: true,
      query: {
        date,
        from,
        to,
        clubSlug,
        duration
      },
      candidates: candidates.slice(0, 16),
      readyMatches,
      availabilityErrors: availability.errors || []
    });
  } catch (error) {
    console.error("Błąd matchmaking ready:", error.message);

    res.status(500).json({
      ok: false,
      message: "Nie udało się złożyć gotowych meczów.",
      error: error.message
    });
  }
});

module.exports = router;
