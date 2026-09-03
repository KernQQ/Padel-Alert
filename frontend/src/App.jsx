import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./styles/app.css";
import "./styles/padletic-update.css";
import "./styles/widget-theme.css";
import "./styles/android-scroll-fix.css";
import "./styles/padletic-12.css";

import { API_URL, REFRESH_SECONDS, DURATIONS, NAVIGATION } from "./config/app";
import {
  getToday,
  timeToMinutes,
  minutesToTime,
  formatDate,
  formatShortDate,
  getAvatarHue
} from "./utils/date";
import { readStorage, writeStorage } from "./utils/storage";
import { apiFetch } from "./services/api";
import Toast from "./components/Toast";
import MatchPage from "./components/MatchPage";
import SmartLobby from "./components/SmartLobby";
import HomeDashboard from "./components/HomeDashboard";
import LevelSelect from "./components/ui/LevelSelect";
import LevelBadge from "./components/ui/LevelBadge";
import InstallAppButton from "./components/InstallAppButton";
import MyMatchesPanel from "./components/MyMatchesPanel";
import MatchInvitationsPanel from "./components/MatchInvitationsPanel";
import ConnectionBanner from "./components/ConnectionBanner";
import AccountPanel from "./components/AccountPanel";
import AdminPanel from "./components/AdminPanel";
import ProfilePhotoCropper from "./components/ProfilePhotoCropper";
import { useRealtime } from "./hooks/useRealtime";
import { LEVELS, getMatchScore, normalizeLevel } from "./utils/levels";



const BO5_CLUB_URLS = {
  "padel-arena-poludniowa":
    "https://bo5.pl/padelARENApoludniowa/reservation/624/Padel",
  "padel-club":
    "https://bo5.pl/padelclub/reservation",
  "fabryka-energii":
    "https://bo5.pl/fabrykaenergii/reservation/528/Padel"
};

const BO5_CLUB_URLS_BY_ID = {
  "264": "https://bo5.pl/padelARENApoludniowa/reservation/624/Padel",
  "624": "https://bo5.pl/padelARENApoludniowa/reservation/624/Padel",
  "595": "https://bo5.pl/padelclub/reservation",
  "528": "https://bo5.pl/fabrykaenergii/reservation/528/Padel"
};

function normalizeClubKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


async function prepareProfilePhoto(file) {
  if (!file) return "";
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
    throw new Error("Wybierz zdjęcie JPG, PNG lub WEBP.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Zdjęcie źródłowe może mieć maksymalnie 8 MB.");
  }

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nie udało się odczytać zdjęcia."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nie udało się otworzyć zdjęcia."));
    img.src = source;
  });

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function resolveBo5ClubBase(proposal, club) {
  const idCandidates = [
    proposal?.clubId,
    proposal?.blocks?.[0]?.clubId,
    club?.id
  ]
    .filter(Boolean)
    .map(String);

  for (const id of idCandidates) {
    if (BO5_CLUB_URLS_BY_ID[id]) {
      return BO5_CLUB_URLS_BY_ID[id];
    }
  }

  const slugCandidates = [
    proposal?.clubSlug,
    proposal?.blocks?.[0]?.clubSlug,
    club?.slug
  ].filter(Boolean);

  for (const slug of slugCandidates) {
    if (BO5_CLUB_URLS[slug]) {
      return BO5_CLUB_URLS[slug];
    }
  }

  const normalizedName = normalizeClubKey(
    proposal?.clubName ||
    proposal?.blocks?.[0]?.clubName ||
    club?.name ||
    ""
  );

  if (normalizedName.includes("padel-arena-poludniowa")) {
    return BO5_CLUB_URLS["padel-arena-poludniowa"];
  }

  if (normalizedName === "padel-club" || normalizedName.includes("padel-club")) {
    return BO5_CLUB_URLS["padel-club"];
  }

  if (normalizedName.includes("fabryka-energii")) {
    return BO5_CLUB_URLS["fabryka-energii"];
  }

  const fallbackSource =
    club?.sourceUrl ||
    proposal?.sourceUrl ||
    proposal?.blocks?.[0]?.sourceUrl ||
    "";

  return String(fallbackSource).split("?")[0];
}

const BO5_DISCIPLINE_IDS = {
  "padel-arena-poludniowa": "624",
  "padel-club": "595",
  "fabryka-energii": "528"
};

function buildBo5DeepLink(proposal, club) {
  const clubKey =
    proposal?.clubSlug ||
    proposal?.blocks?.[0]?.clubSlug ||
    club?.slug ||
    "";

  const clubName = normalizeClubKey(
    proposal?.clubName ||
    proposal?.blocks?.[0]?.clubName ||
    club?.name ||
    ""
  );

  // Release-safe BO5 redirects.
  // After the V1–V5 experiments we deliberately do NOT use the
  // backend reservationUrl for these three production clubs.
  // Each club always opens its known, stable public BO5 Padel page.
  if (
    clubKey === "padel-arena-poludniowa" ||
    clubName.includes("padel-arena-poludniowa")
  ) {
    return "https://bo5.pl/padelARENApoludniowa/reservation/624/Padel";
  }

  if (
    clubKey === "padel-club" ||
    clubName === "padel-club" ||
    clubName.includes("padel-club")
  ) {
    return "https://bo5.pl/padelclub/reservation/595/Padel";
  }

  if (
    clubKey === "fabryka-energii" ||
    clubName.includes("fabryka-energii")
  ) {
    return "https://bo5.pl/fabrykaenergii/reservation/528/Padel";
  }

  // Fallback for any future/unknown BO5 club.
  const directReservationUrl =
    proposal?.reservationUrl ||
    proposal?.blocks?.find((block) => block?.reservationUrl)?.reservationUrl ||
    "";

  if (directReservationUrl) {
    try {
      return new URL(directReservationUrl, window.location.origin).toString();
    } catch {
      return String(directReservationUrl);
    }
  }

  const base = resolveBo5ClubBase(proposal, club);
  if (!base) return "";

  return base;
}

function NavGlyph({ id }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  if (id === "home") {
    return <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
  }

  if (id === "courts") {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/></svg>;
  }

  if (id === "matches") {
    return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M8.5 9.5c1.8-1.6 5.2-1.6 7 0M8.5 14.5c1.8 1.6 5.2 1.6 7 0"/></svg>;
  }

  if (id === "partners") {
    return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 20c.5-4 2.6-6 5.5-6s5 2 5.5 6M14.5 15c2.8 0 4.7 1.7 5 5"/></svg>;
  }

  if (id === "admin") {
    return <svg {...common}><path d="M12 3 19 6v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3Z"/><path d="m9.5 12 1.6 1.6 3.6-3.8"/></svg>;
  }

  return <svg {...common}><path d="M6 4h12v17l-6-4-6 4z"/></svg>;
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
      <path d="M10 21h4"/>
    </svg>
  );
}

function App() {
  const today = getToday();

  const [activeTab, setActiveTab] = useState("home");
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem("padelalert-profile-photo") || "");
  const [profileCropSource, setProfileCropSource] = useState("");
  const [matchCreateSignal, setMatchCreateSignal] = useState(0);
  const [matchCreatePrefill, setMatchCreatePrefill] = useState(null);
  const [playNowSignal, setPlayNowSignal] = useState(0);
  const [theme, setTheme] = useState("dark");

  const [anonymousToken] = useState(() => {
    const savedToken = localStorage.getItem("padelalert-owner-token");
    if (savedToken) return savedToken;
    const token = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `pa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("padelalert-owner-token", token);
    return token;
  });
  const [ownerToken, setOwnerToken] = useState(anonymousToken);
  const [accountUser, setAccountUser] = useState(null);
  const visibleNavigation = useMemo(() =>
    accountUser?.role === "admin"
      ? [...NAVIGATION, { id: "admin", label: "Admin", icon: "" }]
      : NAVIGATION,
    [accountUser]
  );

  const [clubs, setClubs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [clubSlug, setClubSlug] = useState("all");
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("22:00");
  const [duration, setDuration] = useState(120);
  const [courtType, setCourtType] = useState("all");

  const [activeSearch, setActiveSearch] = useState({
    club: "all",
    date: today,
    from: "18:00",
    to: "22:00",
    courtType: "all"
  });

  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);

  const [favorites, setFavorites] = useState(
    () => readStorage("padelalert-favorites", [])
  );
  const [savedSearches, setSavedSearches] = useState(
    () => readStorage("padelalert-saved-searches", [])
  );
  const [alerts, setAlerts] = useState(
    () => readStorage("padelalert-alerts", [])
  );

  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [playerFormMessage, setPlayerFormMessage] = useState("");
  const [contactPost, setContactPost] = useState(null);
  const [joinPost, setJoinPost] = useState(null);
  const [joinForm, setJoinForm] = useState({ nickname: "", contact: "", message: "" });
  const [myProfile, setMyProfile] = useState({ nickname: "Gość", level: "3.0", preferredSide: "Dowolna", favoriteClubSlug: "all", favoriteClubSlugs: [], availabilityPeriods: [], city: "Szczecin", bio: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [ownerPosts, setOwnerPosts] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState("");
  const knownNotificationIds = useRef(new Set());
  const notificationsInitialized = useRef(false);
  const alertHitIds = useRef(new Set());
  const [playerForm, setPlayerForm] = useState({
    nickname: "",
    contact: "",
    level: "3.0",
    preferredSide: "Dowolna",
    clubSlug: "all",
    date: today,
    from: "18:00",
    to: "21:00",
    flexibleHours: true,
    note: ""
  });

  const [partnerFilters, setPartnerFilters] = useState({
    clubSlug: "all",
    level: "all",
    preferredSide: "all",
    date: "",
    from: "",
    ownOnly: false
  });
  const [partnerSort, setPartnerSort] = useState("soonest");

  useEffect(() => {
    const session = localStorage.getItem("padelalert-session");
    if (!session) return;

    apiFetch("/auth/me", {
      headers: { Authorization: `Bearer ${session}` }
    })
      .then(async response => {
        if (!response.ok) throw new Error("session");
        return response.json();
      })
      .then(data => {
        setAccountUser(data.user);
        setOwnerToken(data.ownerToken);
      })
      .catch(() => {
        localStorage.removeItem("padelalert-session");
        setAccountUser(null);
        setOwnerToken(anonymousToken);
      });
  }, [anonymousToken]);

  async function handleAuthenticated(user) {
    setAccountUser(user);
    setOwnerToken(user.id);
    setToast(`Witaj, ${user.nickname || "Graczu"}!`);
  }

  async function handleLogout() {
    const session = localStorage.getItem("padelalert-session");
    if (session) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session}` }
        });
      } catch {}
    }
    localStorage.removeItem("padelalert-session");
    setAccountUser(null);
    setOwnerToken(anonymousToken);
    setActiveTab("home");
    setToast("Wylogowano.");
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStorage("padelalert-theme", theme);
  }, [theme]);

  useEffect(() => writeStorage("padelalert-favorites", favorites), [favorites]);
  useEffect(
    () => writeStorage("padelalert-saved-searches", savedSearches),
    [savedSearches]
  );
  useEffect(() => writeStorage("padelalert-alerts", alerts), [alerts]);

  useEffect(() => {
    async function loadClubs() {
      try {
        const response = await apiFetch(`/clubs`);
        const data = await response.json();
        setClubs(data.clubs || []);
      } catch {
        setError("Nie udało się pobrać listy klubów.");
      }
    }

    loadClubs();
  }, []);

  const loadCommunity = useCallback(async () => {
    try {
      const headers = { "x-owner-token": ownerToken };
      const [profilesResponse, postsResponse, profileResponse, ownerResponse, outgoingResponse, notificationsResponse] = await Promise.all([
        apiFetch(`/community/profiles`),
        apiFetch(`/community/posts`, { headers }),
        apiFetch(`/community/me`, { headers }),
        apiFetch(`/community/owner/posts`, { headers }),
        apiFetch(`/community/requests/outgoing`, { headers }),
        apiFetch(`/community/notifications`, { headers })
      ]);

      const profilesData = await profilesResponse.json();
      const postsData = await postsResponse.json();
      const profileData = await profileResponse.json();
      const ownerData = await ownerResponse.json();
      const outgoingData = await outgoingResponse.json();
      const notificationsData = await notificationsResponse.json();

      setProfiles(profilesData.profiles || []);
      setPosts(postsData.posts || []);
      if (profileData.profile) {
        setMyProfile(profileData.profile);
        if (Object.prototype.hasOwnProperty.call(profileData.profile, "avatarDataUrl")) {
          const nextPhoto = profileData.profile.avatarDataUrl || "";
          setProfilePhoto(nextPhoto);
          if (nextPhoto) localStorage.setItem("padelalert-profile-photo", nextPhoto);
          else localStorage.removeItem("padelalert-profile-photo");
        }
      }
      setOwnerPosts(ownerData.posts || []);
      setOutgoingRequests(outgoingData.requests || []);

      const nextNotifications = notificationsData.notifications || [];
      const newUnreadNotifications = nextNotifications.filter(
        (notification) =>
          !notification.read &&
          notificationsInitialized.current &&
          !knownNotificationIds.current.has(notification.id)
      );

      setNotifications(nextNotifications);
      knownNotificationIds.current = new Set(
        nextNotifications.map((notification) => notification.id)
      );

      if (!notificationsInitialized.current) {
        notificationsInitialized.current = true;
      } else if (newUnreadNotifications.length > 0) {
        const newest = newUnreadNotifications[0];
        setToast(
          newUnreadNotifications.length === 1
            ? `${newest.title}: ${newest.message}`
            : `Masz ${newUnreadNotifications.length} nowe powiadomienia.`
        );

        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(newest.title, {
            body: newest.message,
            tag: newest.id
          });
        }
      }
    } catch {
      // Reszta aplikacji działa nawet przy chwilowym błędzie społeczności.
    }
  }, [ownerToken]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadCommunity();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadCommunity]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        date: activeSearch.date,
        from: activeSearch.from,
        to: activeSearch.to,
        courtType: activeSearch.courtType
      });

      const endpoint =
        activeSearch.club === "all"
          ? `${API_URL}/availability/all?${params.toString()}`
          : `${API_URL}/availability?club=${encodeURIComponent(
              activeSearch.club
            )}&${params.toString()}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się pobrać terminów.");
      }

      setSlots(data.slots || []);
      setCountdown(REFRESH_SECONDS);
    } catch (requestError) {
      setError(requestError.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [activeSearch]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          loadAvailability();
          return REFRESH_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, loadAvailability]);

  useEffect(() => {
    if (!slots.length || !alerts.length) return;

    for (const alert of alerts) {
      const matchingSlot = slots.find((slot) => {
        const clubMatches =
          !alert.club ||
          alert.club === "all" ||
          slot.clubSlug === alert.club;

        return (
          clubMatches &&
          slot.date === alert.date &&
          slot.hour >= alert.from &&
          slot.hour < alert.to
        );
      });

      if (!matchingSlot) continue;

      const hitKey = `${alert.id}:${matchingSlot.clubSlug}:${matchingSlot.courtId}:${matchingSlot.date}:${matchingSlot.hour}`;

      if (alertHitIds.current.has(hitKey)) continue;
      alertHitIds.current.add(hitKey);

      const message =
        `Wolny kort: ${matchingSlot.clubName}, ${matchingSlot.courtName}, ` +
        `${matchingSlot.date} ${matchingSlot.hour}.`;

      setToast(message);

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("PADLETIC — znaleziono termin", {
          body: message
        });
      }
    }
  }, [slots, alerts]);

  const groupedProposals = useMemo(() => {
    const slotsByCourt = {};

    slots.forEach((slot) => {
      const courtKey = `${slot.clubSlug}-${slot.courtId}`;

      if (!slotsByCourt[courtKey]) {
        slotsByCourt[courtKey] = new Map();
      }

      slotsByCourt[courtKey].set(slot.hour, slot);
    });

    const requiredBlocks = duration / 30;
    const proposalsByTime = {};

    Object.entries(slotsByCourt).forEach(([courtKey, courtSlots]) => {
      const sortedHours = [...courtSlots.keys()].sort(
        (first, second) =>
          timeToMinutes(first) - timeToMinutes(second)
      );

      sortedHours.forEach((startHour) => {
        const bookingBlocks = [];
        const startMinutes = timeToMinutes(startHour);

        for (let index = 0; index < requiredBlocks; index += 1) {
          const expectedHour = minutesToTime(startMinutes + index * 30);
          const slot = courtSlots.get(expectedHour);

          if (!slot) return;
          bookingBlocks.push(slot);
        }

        const endHour = minutesToTime(startMinutes + duration);

        if (timeToMinutes(endHour) > timeToMinutes(activeSearch.to)) {
          return;
        }

        const key = `${startHour}-${endHour}`;

        if (!proposalsByTime[key]) {
          proposalsByTime[key] = {
            startHour,
            endHour,
            courts: []
          };
        }

        const firstSlot = bookingBlocks[0];

        proposalsByTime[key].courts.push({
          courtKey,
          clubId: firstSlot.clubId,
          courtId: firstSlot.courtId,
          courtName: firstSlot.courtName,
          clubSlug: firstSlot.clubSlug,
          clubName: firstSlot.clubName,
          courtType: firstSlot.courtType,
          date: firstSlot.date,
          startHour: firstSlot.time || firstSlot.startHour,
          sourceUrl: firstSlot.sourceUrl || "",
          blocks: bookingBlocks
        });
      });
    });

    return Object.values(proposalsByTime).sort(
      (first, second) =>
        timeToMinutes(first.startHour) -
        timeToMinutes(second.startHour)
    );
  }, [slots, duration, activeSearch.to]);

  const ranked = useMemo(() => {
    const start = timeToMinutes(activeSearch.from);

    return groupedProposals
      .flatMap((proposal) =>
        proposal.courts.map((court) => {
          let score = 100;
          const startMinutes = timeToMinutes(proposal.startHour);

          score -= Math.max(0, (startMinutes - start) / 30) * 4;
          score += Math.min(proposal.courts.length * 3, 15);

          if (favorites.includes(court.courtKey)) score += 12;
          if (court.courtType === "indoor") score += 3;

          return {
            ...court,
            startHour: proposal.startHour,
            endHour: proposal.endHour,
            score: Math.max(1, Math.min(100, Math.round(score)))
          };
        })
      )
      .sort((first, second) => second.score - first.score);
  }, [groupedProposals, activeSearch.from, favorites]);

  const topRecommendations = ranked.slice(0, 3);
  const ownPosts = posts.filter((post) => post.canDelete);
  const unreadNotificationsCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const realtimeStatus = useRealtime({
    ownerToken,
    onCommunityChanged: () => {
      loadCommunity();
    }
  });

  const filteredPartnerPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      const matchesClub =
        partnerFilters.clubSlug === "all" ||
        post.clubSlug === "all" ||
        post.clubSlug === partnerFilters.clubSlug;

      const matchesLevel =
        partnerFilters.level === "all" ||
        post.level === partnerFilters.level;

      const matchesSide =
        partnerFilters.preferredSide === "all" ||
        post.preferredSide === "Dowolna" ||
        post.preferredSide === partnerFilters.preferredSide;

      const matchesDate =
        !partnerFilters.date || post.date === partnerFilters.date;

      const matchesTime =
        !partnerFilters.from || post.to >= partnerFilters.from;

      const matchesOwner =
        !partnerFilters.ownOnly || post.canDelete;

      return (
        matchesClub &&
        matchesLevel &&
        matchesSide &&
        matchesDate &&
        matchesTime &&
        matchesOwner
      );
    });

    return [...filtered].sort((first, second) => {
      if (partnerSort === "newest") {
        return String(second.createdAt || "").localeCompare(
          String(first.createdAt || "")
        );
      }

      if (partnerSort === "level") {
        return String(first.level || "").localeCompare(
          String(second.level || ""),
          "pl"
        );
      }

      return `${first.date}T${first.from}`.localeCompare(
        `${second.date}T${second.from}`
      );
    });
  }, [posts, partnerFilters, partnerSort]);

  const activeTodayCount = posts.filter(
    (post) => post.date === today
  ).length;

  const clubStats = useMemo(() => {
    return clubs
      .map((club) => ({
        ...club,
        available: ranked.filter((item) => item.clubSlug === club.slug).length
      }))
      .sort((first, second) => second.available - first.available);
  }, [clubs, ranked]);

  const smartMatches = useMemo(() => {
    return posts
      .filter((post) => !post.canDelete && post.status !== "closed")
      .map((post) => ({
        ...post,
        match: getMatchScore({
          playerLevel: myProfile.level,
          matchLevel: post.level,
          favoriteClubSlug: myProfile.favoriteClubSlug,
          clubSlug: post.clubSlug,
          preferredSide: myProfile.preferredSide,
          requestedSide: post.preferredSide
        })
      }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [posts, myProfile]);

  const selectedClub = clubs.find(
    (club) => club.slug === selectedProposal?.clubSlug
  );

  function submitSearch(event) {
    event.preventDefault();

    if (timeToMinutes(from) >= timeToMinutes(to)) {
      setError("Godzina końcowa musi być późniejsza od początkowej.");
      return;
    }

    setActiveSearch({
      club: clubSlug,
      date,
      from,
      to,
      courtType
    });
    setSelectedProposal(null);
    setActiveTab("courts");
  }

  function toggleFavorite(courtKey) {
    setFavorites((current) =>
      current.includes(courtKey)
        ? current.filter((key) => key !== courtKey)
        : [...current, courtKey]
    );
  }

  function saveSearch() {
    const name = window.prompt("Nazwa wyszukiwania:", "Po pracy");

    if (!name) return;

    setSavedSearches((current) => [
      {
        id: crypto.randomUUID(),
        name,
        club: clubSlug,
        date,
        from,
        to,
        duration,
        courtType
      },
      ...current
    ]);

    setToast("Wyszukiwanie zostało zapisane.");
  }

  function applySavedSearch(search) {
    setClubSlug(search.club || "all");
    setDate(search.date || today);
    setFrom(search.from || "18:00");
    setTo(search.to || "22:00");
    setDuration(Number(search.duration) || 90);
    setCourtType(search.courtType || "all");

    setActiveSearch({
      club: search.club || "all",
      date: search.date || today,
      from: search.from || "18:00",
      to: search.to || "22:00",
      courtType: search.courtType || "all"
    });

    setActiveTab("courts");
    setToast(`Wczytano: ${search.name || "zapisane wyszukiwanie"}.`);
  }

  function createAlert() {
    const selectedClub = clubs.find((club) => club.slug === clubSlug);

    setAlerts((current) => [
      {
        id: crypto.randomUUID(),
        club: clubSlug,
        clubName: clubSlug === "all"
          ? "Wszystkie kluby"
          : selectedClub?.name || clubSlug,
        date,
        from,
        to,
        duration,
        courtType,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);

    setToast(
      "Alert zapisany. Gdy PADLETIC zobaczy pasujący wolny termin podczas odświeżania, dostaniesz komunikat."
    );
  }

  function openNewPlayerListing() {
    setEditingPostId(null);
    setPlayerFormMessage("");
    setPlayerForm({
      nickname: "",
      contact: "",
      level: "3.0",
      preferredSide: "Dowolna",
      clubSlug: "all",
      date: today,
      from: "18:00",
      to: "21:00",
      flexibleHours: true,
      note: ""
    });
    setShowPlayerForm(true);
  }

  function editPlayerListing(post) {
    setEditingPostId(post.id);
    setPlayerFormMessage("");
    setPlayerForm({
      nickname: post.nickname || "",
      contact: post.contact || "",
      level: post.level || "3.0",
      preferredSide: post.preferredSide || "Dowolna",
      clubSlug: post.clubSlug || "all",
      date: post.date || today,
      from: post.from || "18:00",
      to: post.to || "21:00",
      flexibleHours: Boolean(post.flexibleHours),
      note: post.note || ""
    });
    setShowPlayerForm(true);
  }

  async function submitPlayerListing(event) {
    event.preventDefault();
    setPlayerFormMessage("");

    const selected = clubs.find(
      (club) => club.slug === playerForm.clubSlug
    );

    const payload = {
      kind: "player-looking-for-match",
      nickname: playerForm.nickname,
      contact: playerForm.contact,
      level: playerForm.level,
      preferredSide: playerForm.preferredSide,
      clubSlug: playerForm.clubSlug,
      clubName:
        playerForm.clubSlug === "all"
          ? "Dowolny klub"
          : selected?.name || playerForm.clubSlug,
      date: playerForm.date,
      from: playerForm.from,
      to: playerForm.to,
      flexibleHours: playerForm.flexibleHours,
      playersNeeded: 3,
      note: playerForm.note,
      ownerToken
    };

    try {
      const isEditing = Boolean(editingPostId);
      const endpoint = isEditing
        ? `${API_URL}/community/posts/${editingPostId}`
        : `${API_URL}/community/posts`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Nie udało się ${
              isEditing ? "zapisać zmian" : "opublikować zgłoszenia"
            }.`
        );
      }

      setPlayerFormMessage(
        isEditing
          ? "Zmiany zostały zapisane."
          : "Zgłoszenie zostało opublikowane."
      );

      await loadCommunity();

      window.setTimeout(() => {
        setShowPlayerForm(false);
        setEditingPostId(null);
        setPlayerFormMessage("");
      }, 700);
    } catch (requestError) {
      setPlayerFormMessage(requestError.message);
    }
  }

  async function deletePlayerListing(post) {
    const confirmed = window.confirm(
      `Czy na pewno usunąć zgłoszenie gracza ${post.nickname}?`
    );

    if (!confirmed) return;

    const response = await fetch(
      `${API_URL}/community/posts/${post.id}`,
      {
        method: "DELETE",
        headers: {
          "x-owner-token": ownerToken
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      window.alert(data.message || "Nie udało się usunąć zgłoszenia.");
      return;
    }

    loadCommunity();
  }

  function openJoinRequest(post) {
    setJoinPost(post);
    setJoinForm({
      nickname: myProfile.nickname === "Gość" ? "" : myProfile.nickname,
      contact: "",
      message: `Cześć! Chętnie zagram ${post.date} w godzinach ${post.from}–${post.to}.`
    });
  }

  async function submitJoinRequest(event) {
    event.preventDefault();

    try {
      const response = await apiFetch(`/community/posts/${joinPost.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-token": ownerToken
        },
        body: JSON.stringify(joinForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Nie udało się wysłać zgłoszenia.");
      setToast("Zgłoszenie do meczu zostało wysłane.");
      setJoinPost(null);
      await loadCommunity();
    } catch (requestError) {
      setToast(requestError.message);
    }
  }

  async function updateRequestStatus(requestId, status) {
    const response = await apiFetch(`/community/requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.message || "Nie udało się zmienić statusu.");
      return;
    }
    setToast(status === "accepted" ? "Gracz został zaakceptowany." : "Zgłoszenie zostało odrzucone.");
    loadCommunity();
  }

  async function updatePostStatus(postId, status) {
    const response = await apiFetch(`/community/posts/${postId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.message || "Nie udało się zmienić statusu zgłoszenia.");
      return;
    }
    setToast(status === "closed" ? "Zgłoszenie zostało zamknięte." : "Zgłoszenie jest ponownie aktywne.");
    loadCommunity();
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMessage("");
    const response = await apiFetch(`/community/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-token": ownerToken
      },
      body: JSON.stringify({ ...myProfile, avatarDataUrl: profilePhoto })
    });
    const data = await response.json();
    if (!response.ok) {
      setProfileMessage(data.message || "Nie udało się zapisać profilu.");
      return;
    }
    setMyProfile(data.profile);
    setProfileMessage("Profil został zapisany.");
  }

  async function enableSystemNotifications() {
    if (!("Notification" in window)) {
      setToast("Ta przeglądarka nie obsługuje powiadomień systemowych.");
      return;
    }

    if (Notification.permission === "granted") {
      setToast("Powiadomienia systemowe są już włączone.");
      return;
    }

    const permission = await Notification.requestPermission();
    setToast(
      permission === "granted"
        ? "Powiadomienia systemowe zostały włączone."
        : "Powiadomienia systemowe nie zostały włączone."
    );
  }

  async function markAllNotificationsRead() {
    await apiFetch(`/community/notifications/read-all`, {
      method: "PATCH",
      headers: { "x-owner-token": ownerToken }
    });
    loadCommunity();
  }

  async function clearAllNotifications() {
    if (notifications.length === 0) return;
    if (!window.confirm("Usunąć wszystkie powiadomienia? Tej operacji nie można cofnąć.")) return;

    const response = await apiFetch(`/community/notifications`, {
      method: "DELETE",
      headers: { "x-owner-token": ownerToken }
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.message || "Nie udało się wyczyścić powiadomień.");
      return;
    }
    setNotifications([]);
    setToast("Lista powiadomień została wyczyszczona.");
  }

  async function copyPlayerContact(post) {
    openJoinRequest(post);
  }

  function renderSearchForm(className = "search-panel") {
    return (
      <form className={className} onSubmit={submitSearch}>
        <label>
          <span>Klub</span>
          <select
            value={clubSlug}
            onChange={(event) => setClubSlug(event.target.value)}
          >
            <option value="all">Wszystkie kluby</option>

            {clubs.map((club) => (
              <option key={club.slug} value={club.slug}>
                {club.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Data</span>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <label>
          <span>Od</span>
          <input
            type="time"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>

        <label>
          <span>Do</span>
          <input
            type="time"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>

        <div className="duration-picker">
          <span>Czas gry</span>

          <div>
            {DURATIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={duration === option.value ? "active" : ""}
                onClick={() => setDuration(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button className="search-submit" type="submit">
          Szukaj
          <span>→</span>
        </button>
      </form>
    );
  }

  return (
    <>
      <ConnectionBanner />
      <div className="app-shell">
      <div className="desktop-top-actions">
        <button
          className="top-icon-button"
          type="button"
          onClick={() => setShowNotificationsPanel(true)}
          title="Powiadomienia"
          aria-label="Powiadomienia"
        >
          <BellIcon />
          {unreadNotificationsCount > 0 && (
            <span>{unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}</span>
          )}
        </button>

        <AccountPanel
          user={accountUser}
          anonymousToken={anonymousToken}
          onAuthenticated={handleAuthenticated}
          onLogout={handleLogout}
          onOpenProfile={() => setActiveTab("saved")}
          avatarUrl={profilePhoto}
        />
      </div>
      <aside className="sidebar">
        <button
          type="button"
          className="brand"
          onClick={() => setActiveTab("home")}
        >
          <span className="brand-mark">P</span>

          <span>
            <strong>PADLETIC</strong>
            <small>Padel w jednym miejscu</small>
          </span>
        </button>

        <nav className="sidebar-nav">
          <span className="nav-caption">Menu</span>

          {visibleNavigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${activeTab === item.id ? "active" : ""} ${item.id === "admin" ? "nav-admin" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon"><NavGlyph id={item.id} /></span>
              {item.label}

              {item.id === "partners" && posts.length > 0 && (
                <small>{posts.length}</small>
              )}

              {item.id === "saved" && unreadNotificationsCount > 0 && (
                <small className="nav-unread-badge">
                  {unreadNotificationsCount > 9
                    ? "9+"
                    : unreadNotificationsCount}
                </small>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-profile">
          <span className={`profile-avatar ${profilePhoto ? "has-photo" : ""}`}>{profilePhoto ? <img src={profilePhoto} alt="" /> : (myProfile.nickname || "G").slice(0, 1).toUpperCase()}</span>

          <div>
            <strong>{myProfile.nickname || "Gość"}</strong>
            <small>{myProfile.level || "Profil lokalny"}</small>
          </div>
        </div>

        <div className="sidebar-actions">
          <InstallAppButton variant="sidebar" />

          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <span>{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Tryb ciemny" : "Tryb jasny"}
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-brand"
            onClick={() => setActiveTab("home")}
          >
            <span className="brand-mark">P</span>
            <strong>PADLETIC</strong>
          </button>

          <div className="mobile-topbar-actions">
            <button
              type="button"
              className="mobile-icon-button"
              onClick={() => setShowNotificationsPanel(true)}
              aria-label="Powiadomienia"
            >
              <BellIcon />
              {unreadNotificationsCount > 0 && (
                <span className="mobile-top-unread">
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              )}
            </button>

            <AccountPanel
              user={accountUser}
              anonymousToken={anonymousToken}
              onAuthenticated={handleAuthenticated}
              onLogout={handleLogout}
              onOpenProfile={() => setActiveTab("saved")}
              avatarUrl={profilePhoto}
            />
          </div>
        </header>

        <main className="page">
          {activeTab === "home" && (
            <HomeDashboard
              nickname={myProfile.nickname || "Gość"}
              level={myProfile.level}
              countdown={countdown}
              recommendations={topRecommendations}
              clubStats={clubStats}
              players={posts}
              duration={duration}
              date={date}
              from={from}
              onOpenCourts={() => setActiveTab("courts")}
              onOpenMatches={() => setActiveTab("matches")}
              onOpenPlayers={() => setActiveTab("partners")}
              onOpenSaved={() => setActiveTab("saved")}
              onSelectCourt={(item) => {
                setSelectedProposal(item);
                setActiveTab("courts");
              }}
              onInvitePlayer={openJoinRequest}
            />
          )}

          {activeTab === "courts" && (
            <div className="consumer-courts">
              <header className="consumer-page-header">
                <div>
                  <p>Szczecin</p>
                  <h1>Wolne korty</h1>
                </div>
                <span className="consumer-refresh-status">
                  <i /> aktualizacja za {countdown}s
                </span>
              </header>

              <section className="consumer-search-card">
                <div className="consumer-date-pills">
                  {[0, 1, 2, 3].map((offset) => {
                    const base = new Date(`${today}T12:00:00`);
                    base.setDate(base.getDate() + offset);
                    const value = [
                      base.getFullYear(),
                      String(base.getMonth() + 1).padStart(2, "0"),
                      String(base.getDate()).padStart(2, "0")
                    ].join("-");
                    const labels = ["Dzisiaj", "Jutro"];
                    const label = labels[offset] || base.toLocaleDateString("pl-PL", {
                      weekday: "short",
                      day: "numeric"
                    });

                    return (
                      <button
                        key={value}
                        type="button"
                        className={date === value ? "active" : ""}
                        onClick={() => setDate(value)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {renderSearchForm("consumer-search-form")}
              </section>

              <div className="consumer-toolbar">
                <button type="button" onClick={saveSearch}>Zapisz wyszukiwanie</button>
                <button type="button" onClick={createAlert}>Utwórz alert</button>
                <button type="button" onClick={loadAvailability}>Odśwież</button>
                <label>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                  />
                  Auto
                </label>
              </div>

              {loading && (
                <div className="consumer-loading">
                  <div />
                  <div />
                  <div />
                </div>
              )}

              {error && <div className="consumer-error">{error}</div>}

              {!loading && !error && groupedProposals.length > 0 && (
                <section className="consumer-results">
                  <header>
                    <div>
                      <h2>Dostępne terminy</h2>
                      <p>
                        {groupedProposals.reduce(
                          (total, group) => total + group.courts.length,
                          0
                        )} dostępnych kortów
                      </p>
                    </div>
                  </header>

                  <div className="consumer-time-list">
                    {groupedProposals.map((proposal) => (
                      <article
                        className="consumer-time-group"
                        key={`${proposal.startHour}-${proposal.endHour}`}
                      >
                        <div className="consumer-time-column">
                          <strong>{proposal.startHour}</strong>
                          <small>do {proposal.endHour}</small>
                        </div>

                        <div className="consumer-court-options">
                          {proposal.courts.map((court) => (
                            <button
                              type="button"
                              key={`${proposal.startHour}-${court.courtKey}`}
                              onClick={() =>
                                setSelectedProposal({
                                  ...court,
                                  startHour: proposal.startHour,
                                  endHour: proposal.endHour
                                })
                              }
                            >
                              <span>
                                <strong>{court.clubName}</strong>
                                <small>{court.courtName}</small>
                              </span>
                              <b>Wybierz</b>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!loading && !error && groupedProposals.length === 0 && (
                <section className="consumer-no-results">
                  <span className="consumer-no-results-mark">—</span>
                  <h2>Brak wolnych kortów w tym przedziale.</h2>
                  <p>Spróbuj innej godziny albo sprawdź następny dzień.</p>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setFrom("16:00");
                        setTo("22:00");
                      }}
                    >
                      Pokaż od 16:00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const base = new Date(`${date}T12:00:00`);
                        base.setDate(base.getDate() + 1);
                        setDate([
                          base.getFullYear(),
                          String(base.getMonth() + 1).padStart(2, "0"),
                          String(base.getDate()).padStart(2, "0")
                        ].join("-"));
                      }}
                    >
                      Sprawdź jutro
                    </button>
                  </div>
                </section>
              )}

              {selectedProposal && createPortal((
                <section className="consumer-booking-sheet">
                  <div>
                    <small>Wybrany termin</small>
                    <strong>
                      {selectedProposal.startHour}–{selectedProposal.endHour}
                      {" · "}
                      {selectedProposal.clubName}
                    </strong>
                    <span>{selectedProposal.courtName}</span>
                  </div>

                  <div className="consumer-booking-actions">
                    <button type="button" onClick={() => setSelectedProposal(null)}>
                      Zmień
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMatchCreatePrefill({
                          clubSlug: selectedProposal.clubSlug,
                          date: selectedProposal.date || activeSearch.date,
                          from: selectedProposal.startHour,
                          to: selectedProposal.endHour,
                          courtId: selectedProposal.courtId,
                          courtName: selectedProposal.courtName,
                          courtType: selectedProposal.courtType,
                          reservationUrl: selectedProposal.reservationUrl || "",
                          level: myProfile.level || "3.0",
                          gameType: "Szukamy pary"
                        });
                        setSelectedProposal(null);
                        setActiveTab("matches");
                        setMatchCreateSignal((value) => value + 1);
                      }}
                    >
                      Utwórz mecz
                    </button>
                    <button
                      type="button"
                      className="consumer-booking-link"
                      onClick={() => {
                        const href = buildBo5DeepLink(selectedProposal, selectedClub);

                        if (!href) {
                          setToast("Nie udało się przygotować linku do rezerwacji.");
                          return;
                        }

                        window.location.assign(href);
                      }}
                    >
                      Przejdź do rezerwacji
                    </button>
                  </div>
                </section>
              ), document.body)}
            </div>
          )}

          {activeTab === "matches" && (
            <MatchPage
              ownerToken={ownerToken}
              clubs={clubs}
              profile={myProfile}
              onChanged={loadCommunity}
              createSignal={matchCreateSignal}
              createPrefill={matchCreatePrefill}
              playNowSignal={playNowSignal}
            />
          )}

          {activeTab === "partners" && (
            <>
              <section className="partners-heading partners-heading-premium">
                <div>
                  <span className="eyebrow">Szukam partnera</span>
                  <h1>Znajdź osobę do gry</h1>
                  <p>
                    Wybierz poziom, klub i termin. Gdy ktoś pasuje, kliknij „Zagram”.
                  </p>
                </div>

                <button onClick={openNewPlayerListing}>
                  ＋ Dodaj swoje zgłoszenie
                </button>
              </section>

              <section className="metric-grid partner-metrics">
                <article className="metric-card metric-blue">
                  <span className="metric-icon">◎</span>
                  <div>
                    <strong>{posts.length}</strong>
                    <small>aktywnych zgłoszeń</small>
                  </div>
                </article>

                <article className="metric-card metric-green">
                  <span className="metric-icon">●</span>
                  <div>
                    <strong>{activeTodayCount}</strong>
                    <small>dostępnych dzisiaj</small>
                  </div>
                </article>

                <article className="metric-card metric-amber">
                  <span className="metric-icon">✓</span>
                  <div>
                    <strong>{ownPosts.length}</strong>
                    <small>Twoich zgłoszeń</small>
                  </div>
                </article>
              </section>

              <section className="partner-filter-panel">
                <div className="partner-filter-heading">
                  <div>
                    <span className="section-kicker">Dopasuj grę</span>
                    <h2>Filtry partnerów</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPartnerFilters({
                        clubSlug: "all",
                        level: "all",
                        preferredSide: "all",
                        date: "",
                        from: "",
                        ownOnly: false
                      })
                    }
                  >
                    Wyczyść filtry
                  </button>
                </div>

                <div className="partner-filter-grid">
                  <label>
                    <span>Klub</span>
                    <select
                      value={partnerFilters.clubSlug}
                      onChange={(event) =>
                        setPartnerFilters({
                          ...partnerFilters,
                          clubSlug: event.target.value
                        })
                      }
                    >
                      <option value="all">Wszystkie kluby</option>
                      {clubs.map((club) => (
                        <option key={club.slug} value={club.slug}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Poziom</span>
                    <LevelSelect
                      includeAll
                      value={partnerFilters.level}
                      onChange={(value) =>
                        setPartnerFilters({
                          ...partnerFilters,
                          level: value
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Strona</span>
                    <select
                      value={partnerFilters.preferredSide}
                      onChange={(event) =>
                        setPartnerFilters({
                          ...partnerFilters,
                          preferredSide: event.target.value
                        })
                      }
                    >
                      <option value="all">Dowolna strona</option>
                      <option>Lewa</option>
                      <option>Prawa</option>
                    </select>
                  </label>

                  <label>
                    <span>Data</span>
                    <input
                      type="date"
                      min={today}
                      value={partnerFilters.date}
                      onChange={(event) =>
                        setPartnerFilters({
                          ...partnerFilters,
                          date: event.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Dostępny od</span>
                    <input
                      type="time"
                      value={partnerFilters.from}
                      onChange={(event) =>
                        setPartnerFilters({
                          ...partnerFilters,
                          from: event.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Sortowanie</span>
                    <select
                      value={partnerSort}
                      onChange={(event) =>
                        setPartnerSort(event.target.value)
                      }
                    >
                      <option value="soonest">Najbliższy termin</option>
                      <option value="newest">Najnowsze zgłoszenia</option>
                      <option value="level">Poziom gracza</option>
                    </select>
                  </label>
                </div>

                <label className="own-posts-filter">
                  <input
                    type="checkbox"
                    checked={partnerFilters.ownOnly}
                    onChange={(event) =>
                      setPartnerFilters({
                        ...partnerFilters,
                        ownOnly: event.target.checked
                      })
                    }
                  />
                  <span>Pokaż tylko moje zgłoszenia</span>
                </label>
              </section>

              <div className="partner-content-layout">
                <section className="partner-results-column">
                  <div className="partner-results-header">
                    <div>
                      <span className="section-kicker">
                        Aktualne zgłoszenia
                      </span>
                      <h2>
                        {filteredPartnerPosts.length}{" "}
                        {filteredPartnerPosts.length === 1
                          ? "pasujący gracz"
                          : "pasujących graczy"}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={loadCommunity}
                    >
                      ↻ Odśwież
                    </button>
                  </div>

                  <div className="players-grid premium-players-grid">
                    {filteredPartnerPosts.map((post) => (
                      <article className="player-card premium-player-card" key={post.id}>
                        <div className="player-cover">
                          <span>
                            {post.flexibleHours
                              ? "Elastyczne godziny"
                              : "Konkretny termin"}
                          </span>
                          <strong>{post.level}</strong>
                        </div>

                        <div className="player-body">
                          <div className="player-identity">
                            <span
                              className={`large-avatar colorful-avatar ${post.avatarDataUrl ? "has-photo" : ""}`}
                              style={{
                                "--avatar-hue": getAvatarHue(post.nickname)
                              }}
                            >
                              {post.avatarDataUrl ? <img src={post.avatarDataUrl} alt="" /> : post.nickname.slice(0, 1).toUpperCase()}
                            </span>

                            <div>
                              <h3>{post.nickname}</h3>
                              <p>
                                {post.city || "Szczecin"} · strona {post.preferredSide || "Dowolna"}
                              </p>
                              <div className="player-card-profileline">
                                {(post.availabilityPeriods || []).map((period) => <span key={period}>{period}</span>)}
                              </div>
                            </div>

                            {post.canDelete && (
                              <span className="own-listing-badge">
                                Twoje
                              </span>
                            )}
                          </div>

                          <div className="player-details">
                            <article>
                              <span>📍</span>
                              <div>
                                <small>Klub</small>
                                <strong>{post.clubName}</strong>
                              </div>
                            </article>

                            <article>
                              <span>📅</span>
                              <div>
                                <small>Termin</small>
                                <strong>{formatDate(post.date)}</strong>
                              </div>
                            </article>

                            <article>
                              <span>🕒</span>
                              <div>
                                <small>Godziny</small>
                                <strong>
                                  {post.flexibleHours ? "Około " : ""}
                                  {post.from}–{post.to}
                                </strong>
                              </div>
                            </article>
                          </div>

                          {post.note ? (
                            <blockquote>{post.note}</blockquote>
                          ) : (
                            <p className="player-default-note">
                              Chętnie dołączę do meczu w podanym terminie.
                            </p>
                          )}

                          <div className="player-card-meta">
                            <span>
                              {post.requestsCount || 0} zainteresowanych
                            </span>
                            <span>
                              {post.createdAt
                                ? `Dodano ${formatShortDate(
                                    post.createdAt.slice(0, 10)
                                  )}`
                                : "Aktywne zgłoszenie"}
                            </span>
                          </div>

                          <div className="player-actions">
                            {post.canDelete && (
                              <>
                                <button
                                  className="secondary-action"
                                  onClick={() => editPlayerListing(post)}
                                >
                                  Edytuj
                                </button>

                                <button
                                  className="danger-action"
                                  onClick={() => deletePlayerListing(post)}
                                >
                                  Usuń
                                </button>
                              </>
                            )}

                            {!post.canDelete && (
                              <button
                                className="primary-action"
                                onClick={() => copyPlayerContact(post)}
                              >
                                Zagram
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}

                    {filteredPartnerPosts.length === 0 && (
                      <div className="empty-state large partner-empty-state">
                        <span className="empty-state-icon">◎</span>
                        <h2>
                          {posts.length === 0
                            ? "Nie ma jeszcze zgłoszeń"
                            : "Brak graczy spełniających filtry"}
                        </h2>
                        <p>
                          {posts.length === 0
                            ? "Dodaj swoją dyspozycyjność i uruchom społeczność."
                            : "Zmień klub, poziom, datę albo godzinę."}
                        </p>

                        <div className="empty-state-actions">
                          <button onClick={openNewPlayerListing}>
                            Dodaj swoje zgłoszenie
                          </button>

                          {posts.length > 0 && (
                            <button
                              className="empty-secondary-button"
                              onClick={() =>
                                setPartnerFilters({
                                  clubSlug: "all",
                                  level: "all",
                                  preferredSide: "all",
                                  date: "",
                                  from: "",
                                  ownOnly: false
                                })
                              }
                            >
                              Wyczyść filtry
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="partner-side-column">
                  <section className="partner-side-card online-card">
                    <div className="side-card-heading">
                      <div>
                        <span className="live-dot" />
                        <strong>Gracze online</strong>
                      </div>
                      <small>{profiles.length}</small>
                    </div>

                    <div className="online-player-list">
                      {profiles.slice(0, 5).map((profile) => (
                        <article key={profile.id}>
                          <span
                            className={`small-avatar colorful-avatar ${profile.avatarDataUrl ? "has-photo" : ""}`}
                            style={{
                              "--avatar-hue": getAvatarHue(profile.nickname)
                            }}
                          >
                            {profile.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="" /> : profile.nickname.slice(0, 1).toUpperCase()}
                          </span>

                          <div>
                            <strong>{profile.nickname}</strong>
                            <small>
                              {profile.level} · {profile.preferredSide}
                            </small>
                          </div>

                          <span className="online-indicator" />
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="partner-side-card">
                    <span className="section-kicker">Szybki start</span>
                    <h3>Nie widzisz odpowiedniego gracza?</h3>
                    <p>
                      Dodaj własne zgłoszenie. Zajmuje to mniej niż minutę.
                    </p>

                    <button
                      className="side-primary-button"
                      onClick={openNewPlayerListing}
                    >
                      ＋ Dodaj dyspozycyjność
                    </button>
                  </section>

                  <section className="partner-side-card tips-card">
                    <span className="section-kicker">Dobre zgłoszenie</span>
                    <ul>
                      <li>Podaj realny poziom gry.</li>
                      <li>Zaznacz, czy godziny są elastyczne.</li>
                      <li>Dodaj krótki opis rodzaju gry.</li>
                    </ul>
                  </section>
                </aside>
              </div>
            </>
          )}

          {activeTab === "admin" && accountUser?.role === "admin" && (
            <AdminPanel onChanged={loadCommunity} />
          )}

          {activeTab === "saved" && (
            <>
              <section className="page-heading my-center-heading">
                <span className="eyebrow">Moje</span>
                <h1>Twoja gra</h1>
                <p>Profil, mecze, alerty i zapisane wyszukiwania.</p>
              </section>

              <section className="account-summary-card">
                <div className="account-summary-main">
                  <span
                    className={`profile-editor-avatar colorful-avatar ${profilePhoto ? "has-photo" : ""}`}
                    style={{ "--avatar-hue": getAvatarHue(myProfile.nickname) }}
                  >
                    {profilePhoto ? <img src={profilePhoto} alt="Zdjęcie profilowe" /> : (myProfile.nickname || "G").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="account-summary-name">
                      <h2>{myProfile.nickname || "Gość"}</h2>
                      <LevelBadge level={myProfile.level || "3.0"} compact plain />
                    </div>
                    <p>{myProfile.city || "Szczecin"} · {myProfile.preferredSide || "Dowolna"}</p>
                  </div>
                </div>
                <button className="account-edit-button" type="button" onClick={() => setShowProfileEditor(true)}>
                  Edytuj profil
                </button>
              </section>

              <div className="account-quick-grid">
                <button type="button" onClick={() => setActiveTab("matches")}>
                  <span className="account-quick-icon">▣</span>
                  <strong>Moje mecze</strong>
                  <small>Przejdź do meczów</small>
                  <b>→</b>
                </button>
                <button type="button" onClick={() => setShowNotificationsPanel(true)}>
                  <span className="account-quick-icon"><BellIcon /></span>
                  <strong>Powiadomienia</strong>
                  <small>{unreadNotificationsCount} nieprzeczytanych</small>
                  <b>→</b>
                </button>
                <button type="button" onClick={openNewPlayerListing}>
                  <span className="account-quick-icon">＋</span>
                  <strong>Moje zgłoszenia</strong>
                  <small>{ownerPosts.length} wszystkich</small>
                  <b>→</b>
                </button>
                <button type="button" onClick={() => setActiveTab("courts")}>
                  <span className="account-quick-icon">⌕</span>
                  <strong>Zapisane wyszukiwania</strong>
                  <small>{savedSearches.length} zapisanych</small>
                  <b>→</b>
                </button>
                <InstallAppButton variant="tile" />
              </div>

              <MatchInvitationsPanel
                ownerToken={ownerToken}
              />

              <MyMatchesPanel
                ownerToken={ownerToken}
                refreshSignal={unreadNotificationsCount}
              />

              <section className="owner-posts-section">
                <div className="section-heading">
                  <div><span className="section-kicker">Moje zgłoszenia</span><h2>Zainteresowani gracze</h2></div>
                  <button onClick={openNewPlayerListing}>＋ Dodaj zgłoszenie</button>
                </div>
                <div className="owner-post-list">
                  {ownerPosts.map((post) => (
                    <article className="owner-post-card" key={post.id}>
                      <header>
                        <div><span className={`status-badge status-${post.status}`}>{post.status === "open" ? "Aktywne" : post.status === "closed" ? "Zamknięte" : "Anulowane"}</span><h3>{post.clubName}</h3><p>{formatDate(post.date)} · {post.from}–{post.to}</p></div>
                        <div className="owner-post-actions"><button onClick={() => editPlayerListing(post)}>Edytuj</button><button onClick={() => updatePostStatus(post.id, post.status === "open" ? "closed" : "open")}>{post.status === "open" ? "Zamknij" : "Otwórz ponownie"}</button><button className="danger-action" onClick={() => deletePlayerListing(post)}>Usuń</button></div>
                      </header>
                      <div className="request-list">
                        {(post.requests || []).map((request) => (
                          <article key={request.id}>
                            <span className="small-avatar colorful-avatar" style={{ "--avatar-hue": getAvatarHue(request.nickname) }}>{request.nickname.slice(0,1).toUpperCase()}</span>
                            <div><strong>{request.nickname}</strong><p>{request.message || "Chętnie dołączę do meczu."}</p><small>{request.contact}</small></div>
                            <span className={`request-status request-${request.status}`}>{request.status === "pending" ? "Oczekuje" : request.status === "accepted" ? "Zaakceptowany" : "Odrzucony"}</span>
                            {request.status === "pending" && <div className="request-actions"><button onClick={() => updateRequestStatus(request.id, "accepted")}>Akceptuj</button><button onClick={() => updateRequestStatus(request.id, "rejected")}>Odrzuć</button></div>}
                          </article>
                        ))}
                        {(post.requests || []).length === 0 && <div className="empty-state">Nikt jeszcze się nie zgłosił.</div>}
                      </div>
                    </article>
                  ))}
                  {ownerPosts.length === 0 && (
                    <div className="empty-state large my-empty-state">
                      <span className="my-empty-icon">♧</span>
                      <div>
                        <strong>Nie masz jeszcze własnych ogłoszeń.</strong>
                        <p>Dodaj ogłoszenie, aby znaleźć partnerów do gry.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="saved-grid secondary-saved-grid v6-saved-grid">
                <section className="saved-panel">
                  <h2>Zapisane wyszukiwania</h2>
                  {savedSearches.map((search) => (
                    <article key={search.id}>
                      <div>
                        <strong>{search.name}</strong>
                        <small>{search.date} · {search.from}–{search.to} · {search.duration} min</small>
                      </div>
                      <div className="v6-inline-actions">
                        <button onClick={() => applySavedSearch(search)}>Otwórz</button>
                        <button onClick={() => setSavedSearches((current) => current.filter((item) => item.id !== search.id))}>Usuń</button>
                      </div>
                    </article>
                  ))}
                  {savedSearches.length === 0 && (
                    <div className="saved-empty-card">
                      <span className="saved-empty-icon">⌕</span>
                      <div>
                        <strong>Nie masz zapisanych wyszukiwań.</strong>
                        <p>Zapisane filtry i terminy pojawią się tutaj.</p>
                      </div>
                      <button type="button" onClick={() => setActiveTab("courts")}>
                        Przeglądaj korty <span>→</span>
                      </button>
                    </div>
                  )}
                </section>

                <section className="saved-panel">
                  <h2>Alerty kortów</h2>
                  {alerts.map((alert) => (
                    <article key={alert.id}>
                      <div>
                        <strong>{alert.clubName || alert.club || "Wszystkie kluby"}</strong>
                        <small>{alert.date} · {alert.from}–{alert.to} · {alert.duration} min</small>
                      </div>
                      <button onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}>Usuń</button>
                    </article>
                  ))}
                  {alerts.length === 0 && (
                    <div className="saved-empty-card">
                      <span className="saved-empty-icon">♧</span>
                      <div>
                        <strong>Nie masz aktywnych alertów.</strong>
                        <p>Ustaw alert, a PADLETIC przypomni Ci o wolnym korcie.</p>
                      </div>
                      <button type="button" onClick={() => setActiveTab("courts")}>
                        Ustaw alerty <span>→</span>
                      </button>
                    </div>
                  )}
                </section>

                <section className="saved-panel">
                  <h2>Wysłane zgłoszenia</h2>
                  {outgoingRequests.map((request) => (
                    <article key={request.id}>
                      <div>
                        <strong>{request.post?.nickname || "Gracz"}</strong>
                        <small>{request.post?.clubName} · {request.post?.date} · status: {request.status}</small>
                      </div>
                    </article>
                  ))}
                  {outgoingRequests.length === 0 && (
                    <div className="saved-empty-card">
                      <span className="saved-empty-icon">➤</span>
                      <div>
                        <strong>Nie wysłano jeszcze zgłoszeń.</strong>
                        <p>Znajdź gracza i wyślij zaproszenie do wspólnej gry.</p>
                      </div>
                      <button type="button" onClick={() => setActiveTab("players")}>
                        Zobacz graczy <span>→</span>
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>

        <nav className="mobile-bottom-nav">
          {visibleNavigation.map((item) => (
            <button
              key={item.id}
              className={`${activeTab === item.id ? "active" : ""} ${item.id === "admin" ? "nav-admin" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="mobile-nav-icon"><NavGlyph id={item.id} /></span>
              <small>{item.label}</small>
              {item.id === "saved" && unreadNotificationsCount > 0 && (
                <b className="mobile-unread-badge">
                  {unreadNotificationsCount > 9
                    ? "9+"
                    : unreadNotificationsCount}
                </b>
              )}
            </button>
          ))}
        </nav>
      </div>

      {showNotificationsPanel && (
        <div className="notification-drawer-backdrop" onClick={() => setShowNotificationsPanel(false)}>
          <aside className="notification-drawer" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>Powiadomienia</h2>
              <button type="button" onClick={() => setShowNotificationsPanel(false)} aria-label="Zamknij">×</button>
            </header>
            <div className="notification-drawer-tabs">
              <strong>Wszystkie</strong>
              <span>Nieprzeczytane ({unreadNotificationsCount})</span>
            </div>
            <div className="notification-list notification-drawer-list">
              {notifications.map((notification) => (
                <article className={notification.read ? "read" : ""} key={notification.id}>
                  <span className="notification-dot" />
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{new Date(notification.createdAt).toLocaleString("pl-PL")}</small>
                  </div>
                </article>
              ))}
              {notifications.length === 0 && <div className="empty-state">Brak powiadomień.</div>}
            </div>
            <div className="notification-drawer-actions">
              <button type="button" onClick={enableSystemNotifications}>Włącz powiadomienia systemowe</button>
              <button type="button" onClick={markAllNotificationsRead}>Oznacz wszystkie jako przeczytane</button>
              <button type="button" onClick={clearAllNotifications} disabled={notifications.length === 0}>Wyczyść wszystkie</button>
            </div>
          </aside>
        </div>
      )}

      {showProfileEditor && (
        <div className="profile-modal-backdrop" onClick={() => setShowProfileEditor(false)}>
          <form className="profile-editor-panel profile-editor-modal" onSubmit={async (event) => {
            await saveProfile(event);
            setShowProfileEditor(false);
          }} onClick={(event) => event.stopPropagation()}>
            <div className="profile-modal-head">
              <div>
                <span className="section-kicker">Twój profil</span>
                <h2>Edytuj profil</h2>
              </div>
              <button type="button" onClick={() => setShowProfileEditor(false)} aria-label="Zamknij">×</button>
            </div>
            <div className="profile-photo-editor">
              <span className={`profile-editor-avatar colorful-avatar ${profilePhoto ? "has-photo" : ""}`} style={{ "--avatar-hue": getAvatarHue(myProfile.nickname) }}>
                {profilePhoto ? <img src={profilePhoto} alt="Zdjęcie profilowe" /> : (myProfile.nickname || "G").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>Zdjęcie profilowe</strong>
                <small>JPG, PNG lub WEBP. Zdjęcie zapisze się na Twoim koncie i będzie dostępne na innych urządzeniach.</small>
                <div className="profile-photo-actions">
                  <label className="profile-photo-pick">Wybierz zdjęcie<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
                      setProfileMessage("Wybierz zdjęcie JPG, PNG lub WEBP.");
                      event.target.value = "";
                      return;
                    }
                    if (file.size > 20 * 1024 * 1024) {
                      setProfileMessage("Zdjęcie z galerii może mieć maksymalnie 20 MB.");
                      event.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setProfileCropSource(String(reader.result || ""));
                      setProfileMessage("");
                    };
                    reader.onerror = () => setProfileMessage("Nie udało się odczytać zdjęcia.");
                    reader.readAsDataURL(file);
                    event.target.value = "";
                  }} /></label>
                  {profilePhoto && <button type="button" onClick={() => { setProfilePhoto(""); localStorage.removeItem("padelalert-profile-photo"); }}>Usuń</button>}
                </div>
              </div>
            </div>
            <div className="profile-form-grid">
              <label><span>Pseudonim</span><input value={myProfile.nickname || ""} onChange={(e) => setMyProfile({ ...myProfile, nickname: e.target.value })} /></label>
              <label><span>Miasto</span><input value={myProfile.city || ""} onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })} /></label>
              <label><span>Poziom</span><LevelSelect value={myProfile.level || "3.0"} onChange={(value) => setMyProfile({ ...myProfile, level: value })} /></label>
              <label><span>Strona</span><select value={myProfile.preferredSide || "Dowolna"} onChange={(e) => setMyProfile({ ...myProfile, preferredSide: e.target.value })}><option>Dowolna</option><option>Lewa</option><option>Prawa</option></select></label>
              <div className="profile-preference-block">
                <span>Najczęściej gram</span>
                <div className="profile-chip-row">
                  {["Rano", "Popołudnie", "Wieczór"].map((period) => {
                    const selected = (myProfile.availabilityPeriods || []).includes(period);
                    return (
                      <button key={period} type="button" className={selected ? "active" : ""} onClick={() => {
                        const current = myProfile.availabilityPeriods || [];
                        const next = selected ? current.filter((item) => item !== period) : [...current, period];
                        setMyProfile({ ...myProfile, availabilityPeriods: next });
                      }}>{period}</button>
                    );
                  })}
                </div>
              </div>
              <div className="profile-preference-block">
                <span>Ulubione kluby</span>
                <div className="profile-chip-row">
                  {clubs.map((club) => {
                    const selected = (myProfile.favoriteClubSlugs || (myProfile.favoriteClubSlug && myProfile.favoriteClubSlug !== "all" ? [myProfile.favoriteClubSlug] : [])).includes(club.slug);
                    return (
                      <button key={club.slug} type="button" className={selected ? "active" : ""} onClick={() => {
                        const current = myProfile.favoriteClubSlugs || (myProfile.favoriteClubSlug && myProfile.favoriteClubSlug !== "all" ? [myProfile.favoriteClubSlug] : []);
                        const next = selected ? current.filter((slug) => slug !== club.slug) : [...current, club.slug];
                        setMyProfile({ ...myProfile, favoriteClubSlugs: next, favoriteClubSlug: next[0] || "all" });
                      }}>{club.name}</button>
                    );
                  })}
                </div>
              </div>
              <label className="profile-wide"><span>O mnie</span><textarea value={myProfile.bio || ""} onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })} placeholder="Np. lubię dynamiczną grę i dobrą atmosferę." /></label>
            </div>
            {profileMessage && <div className="form-message">{profileMessage}</div>}
            <button className="profile-save-button" type="submit">Zapisz profil</button>
          </form>
        </div>
      )}

      {profileCropSource && (
        <ProfilePhotoCropper
          source={profileCropSource}
          onCancel={() => setProfileCropSource("")}
          onSave={(value) => {
            setProfilePhoto(value);
            localStorage.setItem("padelalert-profile-photo", value);
            setProfileCropSource("");
            setProfileMessage("Zdjęcie przycięte i skompresowane. Kliknij „Zapisz profil”.");
          }}
        />
      )}

      {toast && (
        <button
          type="button"
          className="app-toast"
          onClick={() => {
            setShowNotificationsPanel(true);
            setToast("");
          }}
        >
          <span className="app-toast-icon"><BellIcon /></span>
          <span>
            <strong>Nowe powiadomienie</strong>
            <small>{toast}</small>
          </span>
          <b>Otwórz →</b>
        </button>
      )}

      {showPlayerForm && (
        <div className="modal-backdrop">
          <form
            className="player-modal"
            onSubmit={submitPlayerListing}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setShowPlayerForm(false);
                setEditingPostId(null);
                setPlayerFormMessage("");
              }}
            >
              ×
            </button>

            <span className="eyebrow">
              {editingPostId ? "EDYCJA ZGŁOSZENIA" : "NOWE ZGŁOSZENIE"}
            </span>

            <h2>
              {editingPostId ? "Edytuj zgłoszenie" : "Szukam meczu"}
            </h2>

            <p>
              Podaj poziom i godziny, w których mniej więcej możesz zagrać.
            </p>

            <div className="form-grid two">
              <label>
                <span>Pseudonim</span>
                <input
                  required
                  value={playerForm.nickname}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      nickname: event.target.value
                    })
                  }
                />
              </label>

              <label>
                <span>Kontakt</span>
                <input
                  required
                  placeholder="telefon, Instagram lub e-mail"
                  value={playerForm.contact}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      contact: event.target.value
                    })
                  }
                />
              </label>
            </div>

            <div className="form-grid two">
              <label>
                <span>Poziom</span>
                <LevelSelect
                  value={playerForm.level}
                  onChange={(value) =>
                    setPlayerForm({
                      ...playerForm,
                      level: value
                    })
                  }
                />
              </label>

              <label>
                <span>Strona</span>
                <select
                  value={playerForm.preferredSide}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      preferredSide: event.target.value
                    })
                  }
                >
                  <option>Dowolna</option>
                  <option>Lewa</option>
                  <option>Prawa</option>
                </select>
              </label>
            </div>

            <label>
              <span>Klub</span>
              <select
                value={playerForm.clubSlug}
                onChange={(event) =>
                  setPlayerForm({
                    ...playerForm,
                    clubSlug: event.target.value
                  })
                }
              >
                <option value="all">Dowolny klub</option>

                {clubs.map((club) => (
                  <option key={club.slug} value={club.slug}>
                    {club.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid three">
              <label>
                <span>Data</span>
                <input
                  type="date"
                  min={today}
                  value={playerForm.date}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      date: event.target.value
                    })
                  }
                />
              </label>

              <label>
                <span>Od</span>
                <input
                  type="time"
                  value={playerForm.from}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      from: event.target.value
                    })
                  }
                />
              </label>

              <label>
                <span>Do</span>
                <input
                  type="time"
                  value={playerForm.to}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      to: event.target.value
                    })
                  }
                />
              </label>
            </div>

            <label className="check-control">
              <input
                type="checkbox"
                checked={playerForm.flexibleHours}
                onChange={(event) =>
                  setPlayerForm({
                    ...playerForm,
                    flexibleHours: event.target.checked
                  })
                }
              />
              <span>Mogę trochę dostosować godziny</span>
            </label>

            <label>
              <span>Wiadomość</span>
              <textarea
                value={playerForm.note}
                placeholder="Napisz kilka słów o grze."
                onChange={(event) =>
                  setPlayerForm({
                    ...playerForm,
                    note: event.target.value
                  })
                }
              />
            </label>

            {playerFormMessage && (
              <div className="form-message">{playerFormMessage}</div>
            )}

            <button className="modal-submit" type="submit">
              {editingPostId ? "Zapisz zmiany" : "Opublikuj zgłoszenie"}
            </button>
          </form>
        </div>
      )}

      {joinPost && (
        <div className="modal-backdrop">
          <form className="join-request-modal" onSubmit={submitJoinRequest}>
            <button type="button" className="modal-close" onClick={() => setJoinPost(null)}>×</button>
            <span className="eyebrow">DOŁĄCZ DO MECZU</span>
            <h2>{joinPost.nickname} szuka gracza</h2>
            <p>{joinPost.clubName} · {formatDate(joinPost.date)} · {joinPost.from}–{joinPost.to}</p>
            <label><span>Twój pseudonim</span><input required value={joinForm.nickname} onChange={(e) => setJoinForm({ ...joinForm, nickname: e.target.value })} /></label>
            <label><span>Kontakt</span><input required placeholder="telefon, Instagram lub e-mail" value={joinForm.contact} onChange={(e) => setJoinForm({ ...joinForm, contact: e.target.value })} /></label>
            <label><span>Wiadomość</span><textarea value={joinForm.message} onChange={(e) => setJoinForm({ ...joinForm, message: e.target.value })} /></label>
            <button className="modal-submit" type="submit">Wyślij zgłoszenie</button>
          </form>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />

      {contactPost && (
        <div className="modal-backdrop">
          <div className="contact-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setContactPost(null)}
            >
              ×
            </button>

            <span className="eyebrow">KONTAKT DO GRACZA</span>
            <h2>{contactPost.nickname}</h2>
            <p>{contactPost.contact}</p>

            <button onClick={() => setContactPost(null)}>Zamknij</button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
