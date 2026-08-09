const express = require("express");
const bo5Service = require("../services/bo5Service");

const router = express.Router();

function filterSlots(slots, filters) {
  const { date, from, to, courtId, courtType } = filters;
  let filteredSlots = slots;

  if (date) {
    filteredSlots = filteredSlots.filter((slot) => slot.date === date);
  }

  if (from) {
    filteredSlots = filteredSlots.filter((slot) => slot.hour >= from);
  }

  if (to) {
    filteredSlots = filteredSlots.filter((slot) => slot.hour <= to);
  }

  if (courtId) {
    filteredSlots = filteredSlots.filter(
      (slot) => String(slot.courtId) === String(courtId)
    );
  }

  if (courtType && courtType !== "all") {
    filteredSlots = filteredSlots.filter(
      (slot) => slot.courtType === courtType
    );
  }

  return filteredSlots;
}

router.get("/", async (req, res) => {
  try {
    const {
      club = "padel-arena-poludniowa",
      date,
      from,
      to,
      courtId,
      courtType
    } = req.query;

    const result = await bo5Service.getAvailability(club);
    const slots = filterSlots(result.slots, {
      date,
      from,
      to,
      courtId,
      courtType
    });

    res.json({
      ok: true,
      club: result.club,
      updatedAt: result.updatedAt,
      count: slots.length,
      filters: {
        club,
        date: date || null,
        from: from || null,
        to: to || null,
        courtId: courtId || null,
        courtType: courtType || "all"
      },
      slots
    });
  } catch (error) {
    console.error("Błąd pobierania dostępności:", error.message);

    const statusCode =
      error.message.startsWith("Nie znaleziono klubu") ? 404 : 500;

    res.status(statusCode).json({
      ok: false,
      message: "Nie udało się pobrać wolnych terminów",
      error: error.message
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { date, from, to, courtId, courtType } = req.query;
    const result = await bo5Service.getAllAvailability();

    const slots = filterSlots(result.slots, {
      date,
      from,
      to,
      courtId,
      courtType
    });

    res.json({
      ok: true,
      mode: "all-clubs",
      clubs: result.clubs,
      updatedAt: result.updatedAt,
      count: slots.length,
      filters: {
        date: date || null,
        from: from || null,
        to: to || null,
        courtId: courtId || null,
        courtType: courtType || "all"
      },
      errors: result.errors,
      slots
    });
  } catch (error) {
    console.error(
      "Błąd pobierania dostępności wszystkich klubów:",
      error.message
    );

    res.status(500).json({
      ok: false,
      message:
        "Nie udało się pobrać dostępności wszystkich klubów",
      error: error.message
    });
  }
});

module.exports = router;
