const express = require("express");
const { randomUUID } = require("crypto");
const { readStore, updateStore } = require("../services/communityStore");
const { broadcast } = require("../services/realtimeHub");

const router = express.Router();

const { sendPush } = require("../services/pushService");
router.use((req, res, next) => {
  const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);

  if (mutating) {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        broadcast("matches.changed", {
          method: req.method,
          path: req.originalUrl
        });
      }
    });
  }

  next();
});

function clean(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function token(req) {
  return clean(req.headers["x-owner-token"], 100);
}

function requireToken(req, res) {
  const value = token(req);

  if (!value) {
    res.status(401).json({
      ok: false,
      message: "Brak identyfikatora użytkownika."
    });
    return null;
  }

  return value;
}

function notify(data, ownerToken, title, message, type = "match") {
  if (!ownerToken) return;

  data.notifications.unshift({
    id: randomUUID(),
    ownerToken,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
  sendPush(data, ownerToken, { title, body: message, url: "/" });
}

function getProfile(data, ownerToken) {
  return data.profiles[ownerToken] || {
    nickname: "Gość",
    level: "3.0",
    preferredSide: "Dowolna",
    favoriteClubSlug: "all",
    city: "Szczecin",
    bio: ""
  };
}

function publicMatch(match, requester) {
  const { ownerToken, ...rest } = match;

  const participants = (match.participants || []).map((participant) => {
    const { ownerToken: participantToken, ...publicParticipant } = participant;

    return {
      ...publicParticipant,
      participantKey: participant.joinedAt,
      isMe: Boolean(requester && participantToken === requester),
      ready: Boolean((match.readiness || {})[participantToken])
    };
  });

  const waitlist = (match.waitlist || []).map((participant) => {
    const { ownerToken: participantToken, ...publicParticipant } = participant;

    return {
      ...publicParticipant,
      participantKey: participant.joinedAt,
      isMe: Boolean(requester && participantToken === requester)
    };
  });

  return {
    ...rest,
    participants,
    waitlist,
    isOwner: Boolean(requester && ownerToken === requester),
    isJoined: Boolean(
      requester &&
      (match.participants || []).some(
        (participant) => participant.ownerToken === requester
      )
    ),
    isWaiting: Boolean(
      requester &&
      (match.waitlist || []).some(
        (participant) => participant.ownerToken === requester
      )
    ),
    playersCount: participants.length,
    spotsLeft: Math.max(0, Number(match.maxPlayers || 4) - participants.length),
    readyCount: participantReadiness(match).filter((item) => item.ready).length,
    missingPlayers: Math.max(
      0,
      Number(match.maxPlayers || 4) - participants.length
    )
  };
}

function purgeExpiredNow(data) {
  const now = Date.now();

  data.nowPlayers = (data.nowPlayers || []).filter((player) => {
    const expiresAt = new Date(player.expiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function matchEndTimestamp(match) {
  if (!match?.date || !match?.to) return NaN;
  return new Date(`${match.date}T${match.to}:00`).getTime();
}

function purgeExpiredMatches(data) {
  const now = Date.now();

  (data.matches || []).forEach((match) => {
    if (["cancelled", "completed"].includes(match.status)) return;

    const endAt = matchEndTimestamp(match);

    if (Number.isFinite(endAt) && endAt < now) {
      match.status = "completed";
      match.autoCompleted = true;
      match.updatedAt = new Date().toISOString();

      (data.matchInvitations || []).forEach((invitation) => {
        if (
          invitation.matchId === match.id &&
          invitation.status === "pending"
        ) {
          invitation.status = "expired";
          invitation.updatedAt = new Date().toISOString();
        }
      });
    }
  });
}

function participantReadiness(match) {
  const readiness = match.readiness || {};

  return (match.participants || []).map((participant) => ({
    ownerToken: participant.ownerToken,
    ready: Boolean(readiness[participant.ownerToken])
  }));
}

router.get("/", async (req, res) => {
  const requester = token(req);
  const data = await updateStore((store) => {
    purgeExpiredMatches(store);
    return store;
  });
  const {
    clubSlug = "all",
    date,
    status = "open",
    level = "all"
  } = req.query;

  let matches = (data.matches || []).map((match) =>
    publicMatch(match, requester)
  );

  if (status !== "all") {
    matches = matches.filter((match) => match.status === status);
  }

  if (clubSlug !== "all") {
    matches = matches.filter(
      (match) =>
        match.clubSlug === clubSlug || match.clubSlug === "all"
    );
  }

  if (date) {
    matches = matches.filter((match) => match.date === date);
  }

  if (level !== "all") {
    matches = matches.filter((match) => match.level === level);
  }

  matches.sort((first, second) =>
    `${first.date}T${first.from}`.localeCompare(
      `${second.date}T${second.from}`
    )
  );

  res.json({
    ok: true,
    count: matches.length,
    matches
  });
});

router.get("/now", async (req, res) => {
  const requester = token(req);

  const players = await updateStore((data) => {
    purgeExpiredNow(data);

    return (data.nowPlayers || []).map((player) => {
      const { ownerToken, ...publicPlayer } = player;

      return {
        ...publicPlayer,
        isMe: Boolean(requester && ownerToken === requester)
      };
    });
  });

  res.json({
    ok: true,
    count: players.length,
    players
  });
});

router.post("/now", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const {
    nickname,
    level,
    preferredSide,
    clubSlug = "all",
    clubName = "Dowolny klub",
    availableUntil
  } = req.body || {};

  const player = await updateStore((data) => {
    purgeExpiredNow(data);

    const profile = getProfile(data, owner);
    const until = availableUntil
      ? new Date(availableUntil)
      : new Date(Date.now() + 2 * 60 * 60 * 1000);

    const item = {
      ownerToken: owner,
      nickname: clean(nickname || profile.nickname || "Gość", 50),
      level: clean(level || profile.level || "3.0", 40),
      preferredSide: clean(
        preferredSide || profile.preferredSide || "Dowolna",
        20
      ),
      clubSlug: clean(clubSlug, 80),
      clubName: clean(
        clubName || (clubSlug === "all" ? "Dowolny klub" : clubSlug),
        100
      ),
      expiresAt: until.toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.nowPlayers = (data.nowPlayers || []).filter(
      (existing) => existing.ownerToken !== owner
    );
    data.nowPlayers.push(item);

    return item;
  });

  res.status(201).json({
    ok: true,
    player
  });
});

router.delete("/now", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  await updateStore((data) => {
    data.nowPlayers = (data.nowPlayers || []).filter(
      (player) => player.ownerToken !== owner
    );
  });

  res.json({ ok: true });
});

router.post("/", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const {
    clubSlug,
    clubName,
    date,
    from,
    to,
    level,
    gameType = "Rekreacja",
    note = "",
    maxPlayers = 4,
    courtId = null,
    courtName = "",
    courtType = "",
    reservationUrl = "",
    inviteOwnerTokens = []
  } = req.body || {};

  if (!clubSlug || !date || !from || !to) {
    return res.status(400).json({
      ok: false,
      message: "Uzupełnij klub, datę oraz godziny meczu."
    });
  }

  if (from >= to) {
    return res.status(400).json({
      ok: false,
      message: "Godzina końcowa musi być późniejsza."
    });
  }

  const match = await updateStore((data) => {
    const profile = getProfile(data, owner);
    const cappedPlayers = Math.max(2, Math.min(4, Number(maxPlayers) || 4));

    const item = {
      id: randomUUID(),
      ownerToken: owner,
      clubSlug: clean(clubSlug, 80),
      clubName: clean(
        clubName || (clubSlug === "all" ? "Dowolny klub" : clubSlug),
        100
      ),
      date: clean(date, 10),
      from: clean(from, 5),
      to: clean(to, 5),
      level: clean(level || profile.level || "3.0", 40),
      gameType: clean(gameType, 40),
      note: clean(note, 300),
      courtId: courtId ? clean(courtId, 60) : null,
      courtName: clean(courtName, 100),
      courtType: clean(courtType, 30),
      reservationUrl: clean(reservationUrl, 500),
      maxPlayers: cappedPlayers,
      status: "open",
      participants: [
        {
          ownerToken: owner,
          nickname: clean(profile.nickname || "Organizator", 50),
          level: clean(profile.level || level || "3.0", 40),
          preferredSide: clean(profile.preferredSide || "Dowolna", 20),
          role: "organizer",
          joinedAt: new Date().toISOString()
        }
      ],
      waitlist: [],
      readiness: {
        [owner]: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.matches.push(item);

    data.matchInvitations = data.matchInvitations || [];

    const uniqueInvitees = [
      ...new Set(
        (Array.isArray(inviteOwnerTokens) ? inviteOwnerTokens : [])
          .map((value) => clean(value, 100))
          .filter(Boolean)
          .filter((value) => value !== owner)
      )
    ].slice(0, cappedPlayers - 1);

    for (const targetToken of uniqueInvitees) {
      const alreadyInvited = data.matchInvitations.some(
        (invitation) =>
          invitation.matchId === item.id &&
          invitation.targetToken === targetToken &&
          invitation.status === "pending"
      );

      if (alreadyInvited) continue;

      data.matchInvitations.push({
        id: randomUUID(),
        matchId: item.id,
        ownerToken: owner,
        targetToken,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      notify(
        data,
        targetToken,
        "Zaproszenie do meczu 🎾",
        `${item.clubName}, ${item.date} ${item.from}–${item.to}.`,
        "match-invitation"
      );
    }

    notify(
      data,
      owner,
      "Mecz utworzony",
      `${item.clubName}, ${item.date} ${item.from}–${item.to}`,
      "match-created"
    );

    return item;
  });

  res.status(201).json({
    ok: true,
    match: publicMatch(match, owner)
  });
});


router.get("/invitations", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const data = await readStore();

  const invitations = (data.matchInvitations || [])
    .filter(
      (invitation) =>
        invitation.targetToken === requester &&
        invitation.status === "pending"
    )
    .map((invitation) => {
      const match = (data.matches || []).find(
        (item) => item.id === invitation.matchId
      );

      const ownerProfile = data.profiles[invitation.ownerToken] || {};

      return {
        id: invitation.id,
        status: invitation.status,
        createdAt: invitation.createdAt,
        organizerName: ownerProfile.nickname || "Organizator",
        match: match ? publicMatch(match, requester) : null
      };
    })
    .filter((invitation) => invitation.match)
    .sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );

  res.json({
    ok: true,
    count: invitations.length,
    invitations
  });
});

router.patch("/invitations/:invitationId", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const decision = clean(req.body.decision, 20);

  if (!["accepted", "rejected"].includes(decision)) {
    return res.status(400).json({
      ok: false,
      message: "Nieprawidłowa odpowiedź na zaproszenie."
    });
  }

  const result = await updateStore((data) => {
    data.matchInvitations = data.matchInvitations || [];

    const invitation = data.matchInvitations.find(
      (item) => item.id === req.params.invitationId
    );

    if (!invitation) {
      return { error: [404, "Nie znaleziono zaproszenia."] };
    }

    if (invitation.targetToken !== requester) {
      return { error: [403, "To zaproszenie nie jest dla Ciebie."] };
    }

    if (invitation.status !== "pending") {
      return { error: [409, "Na to zaproszenie już odpowiedziano."] };
    }

    const match = (data.matches || []).find(
      (item) => item.id === invitation.matchId
    );

    if (!match || ["cancelled", "completed"].includes(match.status)) {
      invitation.status = "expired";

      return {
        error: [410, "Ten mecz nie jest już aktywny."]
      };
    }

    invitation.status = decision;
    invitation.updatedAt = new Date().toISOString();

    if (decision === "rejected") {
      notify(
        data,
        invitation.ownerToken,
        "Zaproszenie odrzucone",
        `${getProfile(data, requester).nickname} nie może dołączyć do meczu.`,
        "match-invitation-rejected"
      );

      return {
        invitation,
        match: publicMatch(match, requester)
      };
    }

    match.participants = match.participants || [];
    match.waitlist = match.waitlist || [];

    const alreadyJoined = match.participants.some(
      (participant) => participant.ownerToken === requester
    );

    if (!alreadyJoined) {
      const profile = getProfile(data, requester);
      const participant = {
        ownerToken: requester,
        nickname: clean(profile.nickname || "Gość", 50),
        level: clean(profile.level || "3.0", 40),
        preferredSide: clean(profile.preferredSide || "Dowolna", 20),
        role: "player",
        joinedAt: new Date().toISOString()
      };

      const maxPlayers = Number(match.maxPlayers || 4);

      if (match.participants.length >= maxPlayers) {
        match.waitlist.push(participant);
        invitation.status = "accepted-waitlist";
      } else {
        match.participants.push(participant);
      }

      match.status =
        match.participants.length >= maxPlayers ? "full" : "open";
      match.updatedAt = new Date().toISOString();

      notify(
        data,
        invitation.ownerToken,
        "Zaproszenie zaakceptowane 🎾",
        `${participant.nickname} dołączył do meczu. Skład: ${match.participants.length}/${maxPlayers}.`,
        "match-invitation-accepted"
      );

      if (match.status === "full") {
        match.participants.forEach((item) => {
          notify(
            data,
            item.ownerToken,
            "Mamy komplet! 🎾",
            `${match.clubName}, ${match.date} ${match.from}.`,
            "match-full"
          );
        });
      }
    }

    return {
      invitation,
      match: publicMatch(match, requester)
    };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({
    ok: true,
    invitation: result.invitation,
    match: result.match
  });
});

function canUseMatchChat(match, requester) {
  return Boolean(
    requester &&
    (match.ownerToken === requester ||
      (match.participants || []).some((participant) => participant.ownerToken === requester))
  );
}

function publicChatMessage(message, requester, match) {
  return {
    id: message.id,
    matchId: message.matchId,
    nickname: message.nickname,
    text: message.text,
    createdAt: message.createdAt,
    editedAt: message.editedAt || null,
    isMe: message.ownerToken === requester,
    canDelete: message.ownerToken === requester || match.ownerToken === requester
  };
}

router.get("/chat-unread", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;
  const data = await readStore();
  const counts = {};
  for (const match of data.matches || []) {
    if (!canUseMatchChat(match, requester)) continue;
    const readAt = data.matchChatReads?.[match.id]?.[requester] || "";
    counts[match.id] = (data.matchMessages?.[match.id] || []).filter(
      (message) => message.ownerToken !== requester && (!readAt || String(message.createdAt) > String(readAt))
    ).length;
  }
  res.json({ ok: true, counts });
});

router.get("/:id/chat", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find((item) => item.id === req.params.id);
    if (!match) return { error: [404, "Nie znaleziono meczu."] };
    if (!canUseMatchChat(match, requester)) return { error: [403, "Czat jest dostępny tylko dla uczestników meczu."] };
    data.matchChatReads ||= {};
    data.matchChatReads[match.id] ||= {};
    data.matchChatReads[match.id][requester] = new Date().toISOString();
    return { messages: (data.matchMessages?.[match.id] || []).slice(-200).map((message) => publicChatMessage(message, requester, match)) };
  });
  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  res.json({ ok: true, messages: result.messages });
});

router.post("/:id/chat", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;
  const text = clean(req.body?.text, 1000);
  if (!text) return res.status(400).json({ ok: false, message: "Wiadomość nie może być pusta." });

  const result = await updateStore((data) => {
    const match = (data.matches || []).find((item) => item.id === req.params.id);
    if (!match) return { error: [404, "Nie znaleziono meczu."] };
    if (!canUseMatchChat(match, requester)) return { error: [403, "Czat jest dostępny tylko dla uczestników meczu."] };

    data.matchMessages ||= {};
    data.matchMessages[match.id] ||= [];
    const profile = getProfile(data, requester);
    const message = {
      id: randomUUID(),
      matchId: match.id,
      ownerToken: requester,
      nickname: clean(profile.nickname || "Gracz", 50),
      text,
      createdAt: new Date().toISOString()
    };
    data.matchMessages[match.id].push(message);
    data.matchMessages[match.id] = data.matchMessages[match.id].slice(-500);

    for (const participant of match.participants || []) {
      if (participant.ownerToken === requester) continue;
      notify(data, participant.ownerToken, `Nowa wiadomość · ${match.clubName}`, `${message.nickname}: ${text.slice(0, 120)}`, "match-chat");
    }

    return { message: publicChatMessage(message, requester, match) };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  broadcast("matches.changed", { method: "CHAT_MESSAGE", matchId: req.params.id });
  res.status(201).json({ ok: true, message: result.message });
});

router.delete("/:id/chat/:messageId", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find((item) => item.id === req.params.id);
    if (!match) return { error: [404, "Nie znaleziono meczu."] };
    if (!canUseMatchChat(match, requester)) return { error: [403, "Brak dostępu do czatu."] };

    const messages = data.matchMessages?.[match.id] || [];
    const message = messages.find((item) => item.id === req.params.messageId);
    if (!message) return { error: [404, "Nie znaleziono wiadomości."] };
    if (message.ownerToken !== requester && match.ownerToken !== requester) {
      return { error: [403, "Możesz usunąć tylko własną wiadomość."] };
    }
    data.matchMessages[match.id] = messages.filter((item) => item.id !== message.id);
    return { ok: true };
  });

  if (result.error) return res.status(result.error[0]).json({ ok: false, message: result.error[1] });
  broadcast("matches.changed", { method: "CHAT_DELETE", matchId: req.params.id });
  res.json({ ok: true });
});

router.get("/:id", async (req, res) => {
  const requester = token(req);
  const data = await readStore();
  const match = (data.matches || []).find(
    (item) => item.id === req.params.id
  );

  if (!match) {
    return res.status(404).json({
      ok: false,
      message: "Nie znaleziono meczu."
    });
  }

  res.json({
    ok: true,
    match: publicMatch(match, requester)
  });
});

router.post("/:id/join", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (match.status !== "open") {
      return { error: [400, "Ten mecz nie przyjmuje już graczy."] };
    }

    match.participants = match.participants || [];
    match.waitlist = match.waitlist || [];

    if (
      match.participants.some(
        (participant) => participant.ownerToken === requester
      )
    ) {
      return { error: [409, "Już jesteś w tym meczu."] };
    }

    if (
      match.waitlist.some(
        (participant) => participant.ownerToken === requester
      )
    ) {
      return { error: [409, "Jesteś już na liście oczekujących."] };
    }

    const profile = getProfile(data, requester);
    const participant = {
      ownerToken: requester,
      nickname: clean(profile.nickname || "Gość", 50),
      level: clean(profile.level || "3.0", 40),
      preferredSide: clean(profile.preferredSide || "Dowolna", 20),
      role: "player",
      joinedAt: new Date().toISOString()
    };

    const maxPlayers = Number(match.maxPlayers || 4);

    if (match.participants.length >= maxPlayers) {
      match.waitlist.push(participant);
      match.updatedAt = new Date().toISOString();

      notify(
        data,
        requester,
        "Lista oczekujących",
        `Jesteś pierwszy w kolejce, gdy zwolni się miejsce w ${match.clubName}.`,
        "match-waitlist"
      );

      return {
        waitlisted: true,
        match: publicMatch(match, requester)
      };
    }

    match.participants.push(participant);
    match.readiness = match.readiness || {};
    match.readiness[requester] = false;
    match.updatedAt = new Date().toISOString();

    notify(
      data,
      match.ownerToken,
      "Ktoś dołączył do meczu",
      `${participant.nickname} dołączył. Skład: ${match.participants.length}/${maxPlayers}.`,
      "match-join"
    );

    if (match.participants.length >= maxPlayers) {
      match.status = "full";

      match.participants.forEach((item) => {
        notify(
          data,
          item.ownerToken,
          "Mamy komplet! 🎾",
          `${match.clubName}, ${match.date} ${match.from}. Mecz ma pełny skład.`,
          "match-full"
        );
      });
    }

    return {
      waitlisted: false,
      match: publicMatch(match, requester)
    };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({
    ok: true,
    waitlisted: result.waitlisted,
    match: result.match
  });
});

router.post("/:id/leave", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    match.participants = match.participants || [];
    match.waitlist = match.waitlist || [];

    if (match.ownerToken === requester) {
      return {
        error: [
          400,
          "Organizator nie może opuścić meczu. Może go anulować."
        ]
      };
    }

    const wasParticipant = match.participants.some(
      (participant) => participant.ownerToken === requester
    );
    const wasWaiting = match.waitlist.some(
      (participant) => participant.ownerToken === requester
    );

    if (!wasParticipant && !wasWaiting) {
      return { error: [400, "Nie należysz do tego meczu."] };
    }

    match.participants = match.participants.filter(
      (participant) => participant.ownerToken !== requester
    );
    match.waitlist = match.waitlist.filter(
      (participant) => participant.ownerToken !== requester
    );
    match.readiness = match.readiness || {};
    delete match.readiness[requester];

    const maxPlayers = Number(match.maxPlayers || 4);

    if (
      wasParticipant &&
      match.participants.length < maxPlayers &&
      match.waitlist.length > 0
    ) {
      const promoted = match.waitlist.shift();
      promoted.joinedAt = new Date().toISOString();
      match.participants.push(promoted);

      notify(
        data,
        promoted.ownerToken,
        "Zwolniło się miejsce! 🎾",
        `Automatycznie dołączyłeś do meczu w ${match.clubName}.`,
        "match-promoted"
      );
    }

    match.status =
      match.participants.length >= maxPlayers ? "full" : "open";
    match.updatedAt = new Date().toISOString();

    notify(
      data,
      match.ownerToken,
      "Zmiana składu meczu",
      `Aktualny skład: ${match.participants.length}/${maxPlayers}.`,
      "match-leave"
    );

    return {
      match: publicMatch(match, requester)
    };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({
    ok: true,
    match: result.match
  });
});

router.delete("/:id/participants/:participantKey", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (match.ownerToken !== owner) {
      return {
        error: [403, "Tylko organizator może usuwać graczy z meczu."]
      };
    }

    match.participants = match.participants || [];
    match.waitlist = match.waitlist || [];

    const participant = match.participants.find(
      (item) => item.joinedAt === req.params.participantKey
    );

    if (!participant) {
      return { error: [404, "Nie znaleziono tego gracza w składzie."] };
    }

    if (participant.ownerToken === match.ownerToken) {
      return {
        error: [400, "Nie można usunąć organizatora z jego własnego meczu."]
      };
    }

    match.participants = match.participants.filter(
      (item) => item.joinedAt !== req.params.participantKey
    );
    match.readiness = match.readiness || {};
    delete match.readiness[participant.ownerToken];

    const maxPlayers = Number(match.maxPlayers || 4);

    if (
      match.participants.length < maxPlayers &&
      match.waitlist.length > 0
    ) {
      const promoted = match.waitlist.shift();
      promoted.joinedAt = new Date().toISOString();
      match.participants.push(promoted);

      notify(
        data,
        promoted.ownerToken,
        "Zwolniło się miejsce! 🎾",
        `Automatycznie dołączyłeś do meczu w ${match.clubName}.`,
        "match-promoted"
      );
    }

    match.status =
      match.participants.length >= maxPlayers ? "full" : "open";
    match.updatedAt = new Date().toISOString();

    notify(
      data,
      participant.ownerToken,
      "Usunięto Cię z meczu",
      `${match.clubName}, ${match.date} ${match.from}–${match.to}.`,
      "match-removed"
    );

    return {
      match: publicMatch(match, owner)
    };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({
    ok: true,
    match: result.match
  });
});


router.patch("/:id", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const allowed = [
    "clubSlug",
    "clubName",
    "date",
    "from",
    "to",
    "level",
    "gameType",
    "note",
    "courtId",
    "courtName",
    "courtType",
    "reservationUrl"
  ];

  const result = await updateStore((data) => {
    purgeExpiredMatches(data);

    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (match.ownerToken !== owner) {
      return { error: [403, "Tylko organizator może edytować mecz."] };
    }

    if (["cancelled", "completed"].includes(match.status)) {
      return { error: [400, "Nie można edytować zakończonego meczu."] };
    }

    const next = { ...match };

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        const max =
          key === "note" ? 300 :
          key === "reservationUrl" ? 500 :
          key === "date" ? 10 :
          ["from", "to"].includes(key) ? 5 : 100;

        next[key] = clean(req.body[key], max);
      }
    }

    if (!next.clubSlug || !next.date || !next.from || !next.to) {
      return { error: [400, "Klub, data i godziny są wymagane."] };
    }

    if (next.from >= next.to) {
      return { error: [400, "Godzina końcowa musi być późniejsza."] };
    }

    Object.assign(match, next, {
      updatedAt: new Date().toISOString()
    });

    (match.participants || []).forEach((participant) => {
      if (participant.ownerToken === owner) return;

      notify(
        data,
        participant.ownerToken,
        "Mecz został zaktualizowany",
        `${match.clubName}, ${match.date} ${match.from}–${match.to}.`,
        "match-updated"
      );
    });

    return { match: publicMatch(match, owner) };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({ ok: true, match: result.match });
});

router.patch("/:id/readiness", async (req, res) => {
  const requester = requireToken(req, res);
  if (!requester) return;

  const ready = Boolean(req.body?.ready);

  const result = await updateStore((data) => {
    purgeExpiredMatches(data);

    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (["cancelled", "completed"].includes(match.status)) {
      return { error: [400, "Ten mecz nie jest już aktywny."] };
    }

    const isParticipant = (match.participants || []).some(
      (participant) => participant.ownerToken === requester
    );

    if (!isParticipant) {
      return { error: [403, "Tylko uczestnik meczu może potwierdzić gotowość."] };
    }

    match.readiness = match.readiness || {};
    match.readiness[requester] = ready;
    match.updatedAt = new Date().toISOString();

    const allReady =
      match.participants.length >= Number(match.maxPlayers || 4) &&
      match.participants.every(
        (participant) => match.readiness[participant.ownerToken]
      );

    if (allReady && match.status === "full") {
      match.status = "confirmed";

      match.participants.forEach((participant) => {
        notify(
          data,
          participant.ownerToken,
          "Wszyscy gotowi ✓",
          `${match.clubName}, ${match.date} ${match.from}. Mecz potwierdzony.`,
          "match-ready"
        );
      });
    }

    return { match: publicMatch(match, requester) };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({ ok: true, match: result.match });
});

router.patch("/:id/status", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const status = clean(req.body.status, 20);

  if (!["open", "full", "confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({
      ok: false,
      message: "Nieprawidłowy status meczu."
    });
  }

  const result = await updateStore((data) => {
    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (match.ownerToken !== owner) {
      return { error: [403, "Tylko organizator może zmienić status."] };
    }

    match.status = status;
    match.updatedAt = new Date().toISOString();

    if (status === "cancelled") {
      data.matchInvitations = data.matchInvitations || [];

      data.matchInvitations.forEach((invitation) => {
        if (
          invitation.matchId === match.id &&
          invitation.status === "pending"
        ) {
          invitation.status = "cancelled";
          invitation.updatedAt = new Date().toISOString();

          notify(
            data,
            invitation.targetToken,
            "Mecz anulowany",
            `${match.clubName}, ${match.date} ${match.from}.`,
            "match-cancelled"
          );
        }
      });
    }

    (match.participants || []).forEach((participant) => {
      notify(
        data,
        participant.ownerToken,
        "Status meczu zmieniony",
        `${match.clubName}: ${status}.`,
        "match-status"
      );
    });

    return {
      match: publicMatch(match, owner)
    };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({
    ok: true,
    match: result.match
  });
});

router.delete("/:id", async (req, res) => {
  const owner = requireToken(req, res);
  if (!owner) return;

  const result = await updateStore((data) => {
    const match = (data.matches || []).find(
      (item) => item.id === req.params.id
    );

    if (!match) {
      return { error: [404, "Nie znaleziono meczu."] };
    }

    if (match.ownerToken !== owner) {
      return { error: [403, "Tylko organizator może usunąć mecz."] };
    }

    data.matches = data.matches.filter(
      (item) => item.id !== req.params.id
    );

    data.matchInvitations = (data.matchInvitations || []).filter(
      (invitation) => invitation.matchId !== req.params.id
    );

    return { ok: true };
  });

  if (result.error) {
    return res.status(result.error[0]).json({
      ok: false,
      message: result.error[1]
    });
  }

  res.json({ ok: true });
});

module.exports = router;
