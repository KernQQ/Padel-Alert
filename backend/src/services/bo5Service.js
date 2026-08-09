const axios = require("axios");
const cheerio = require("cheerio");

const {
  getClubBySlug,
  getPublicClubs
} = require("../config/clubs");

const DEFAULT_CLUB_SLUG = "padel-arena-poludniowa";

const BO5_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8"
};

function getClubs() {
  return getPublicClubs();
}

function getClubOrThrow(clubSlug = DEFAULT_CLUB_SLUG) {
  const club = getClubBySlug(clubSlug);

  if (!club) {
    throw new Error(`Nie znaleziono klubu: ${clubSlug}`);
  }

  return club;
}

async function fetchClubPage(clubSlug = DEFAULT_CLUB_SLUG) {
  const club = getClubOrThrow(clubSlug);

  const response = await axios.get(club.url, {
    timeout: 15000,
    headers: BO5_HEADERS
  });

  return {
    club,
    $: cheerio.load(response.data)
  };
}

async function getAvailability(clubSlug = DEFAULT_CLUB_SLUG) {
  const { club, $ } = await fetchClubPage(clubSlug);
  const calendar = $("#reservation");

  if (!calendar.length) {
    throw new Error(
      `Nie znaleziono kalendarza rezerwacji BO5 dla klubu ${club.name}`
    );
  }

  const dates = [];

  calendar.find("thead th[data-date]").each((index, element) => {
    const header = $(element);

    dates.push({
      columnIndex: header.index(),
      date: header.attr("data-date"),
      label: header.text().replace(/\s+/g, " ").trim()
    });
  });

  const slots = [];

  calendar.find("tbody > tr").each((rowIndex, rowElement) => {
    const row = $(rowElement);
    const rowCells = row.children("td");
    const hourCell = rowCells.first();

    const hour =
      hourCell.attr("data-hour") ||
      hourCell.text().replace(/\s+/g, " ").trim();

    if (!/^\d{2}:\d{2}$/.test(hour)) {
      return;
    }

    dates.forEach(({ columnIndex, date, label }) => {
      const dayCell = rowCells.eq(columnIndex);

      dayCell
        .find("td.success[data-cid]")
        .each((courtIndex, courtElement) => {
          const courtId = $(courtElement).attr("data-cid");

          if (!courtId) {
            return;
          }

          const isOutdoor = club.outdoorCourtIds.includes(String(courtId));

          slots.push({
            clubId: club.id,
            clubSlug: club.slug,
            clubName: club.name,
            clubShortName: club.shortName,
            clubAccent: club.accent,
            courtId,
            courtName: club.courts[courtId] || `Kort ${courtId}`,
            courtType: isOutdoor ? "outdoor" : "indoor",
            date,
            dateLabel: label,
            hour,
            available: true,
            reservationUrl:
              `https://bo5.pl/clubs/ajax.php?namespace=reservation` +
              `&cid=${club.id}` +
              `&hour=${encodeURIComponent(hour)}` +
              `&date=${encodeURIComponent(date)}` +
              `&court=${encodeURIComponent(courtId)}`
          });
        });
    });
  });

  return {
    ok: true,
    club: {
      slug: club.slug,
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      sourceUrl: club.url,
      address: club.address,
      accent: club.accent,
      courts: club.courts,
      outdoorCourtIds: club.outdoorCourtIds
    },
    updatedAt: new Date().toISOString(),
    count: slots.length,
    slots
  };
}

async function getAllAvailability() {
  const clubs = getPublicClubs();

  const results = await Promise.allSettled(
    clubs.map((club) => getAvailability(club.slug))
  );

  const successfulResults = [];
  const errors = [];

  results.forEach((result, index) => {
    const club = clubs[index];

    if (result.status === "fulfilled") {
      successfulResults.push(result.value);
      return;
    }

    errors.push({
      clubSlug: club.slug,
      clubName: club.name,
      error: result.reason?.message || "Nieznany błąd"
    });
  });

  const slots = successfulResults.flatMap((result) => result.slots);

  return {
    ok: errors.length === 0,
    clubs: successfulResults.map((result) => result.club),
    updatedAt: new Date().toISOString(),
    count: slots.length,
    errors,
    slots
  };
}

module.exports = {
  getClubs,
  getAvailability,
  getAllAvailability
};
