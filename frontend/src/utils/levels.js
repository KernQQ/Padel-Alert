export const LEVELS = [
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "3.6",
  "3.7",
  "3.8",
  "3.9",
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0"
];

export function normalizeLevel(value, fallback = "3.0") {
  const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));

  if (Number.isFinite(numeric)) {
    return numeric.toFixed(1);
  }

  const legacy = {
    "Początkujący": "2.0",
    "Początkujący+": "2.5",
    "Średniozaawansowany": "3.5",
    "Zaawansowany": "4.5"
  };

  return legacy[value] || fallback;
}

export function levelNumber(value) {
  return Number.parseFloat(normalizeLevel(value));
}

export function getLevelMeta(value) {
  const level = levelNumber(value);

  if (level < 3) {
    return {
      label: "Początkujący",
      tone: "green"
    };
  }

  if (level < 4) {
    return {
      label: "Średniozaawansowany",
      tone: "blue"
    };
  }

  if (level < 5) {
    return {
      label: "Zaawansowany",
      tone: "purple"
    };
  }

  return {
    label: "Turniejowy / ekspert",
    tone: "red"
  };
}

export function levelDifference(first, second) {
  return Math.abs(levelNumber(first) - levelNumber(second));
}

export function getMatchScore({
  playerLevel,
  matchLevel,
  favoriteClubSlug,
  clubSlug,
  preferredSide,
  requestedSide
}) {
  let score = 98;

  const difference = levelDifference(playerLevel, matchLevel);

  // 0.1 różnicy = bardzo mała kara, 0.5 już wyraźna.
  score -= Math.min(38, difference * 26);

  if (
    favoriteClubSlug &&
    favoriteClubSlug !== "all" &&
    favoriteClubSlug === clubSlug
  ) {
    score += 4;
  }

  if (
    preferredSide &&
    preferredSide !== "Dowolna" &&
    requestedSide &&
    requestedSide !== "Dowolna" &&
    preferredSide !== requestedSide
  ) {
    score -= 4;
  }

  return Math.max(45, Math.min(99, Math.round(score)));
}
