import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles/app.css";

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
import LevelSelect from "./components/ui/LevelSelect";
import LevelBadge from "./components/ui/LevelBadge";
import InstallAppButton from "./components/InstallAppButton";
import MobileQuickActions from "./components/MobileQuickActions";
import MyMatchesPanel from "./components/MyMatchesPanel";
import MatchInvitationsPanel from "./components/MatchInvitationsPanel";
import RealtimeBadge from "./components/RealtimeBadge";
import ConnectionBanner from "./components/ConnectionBanner";
import AccountPanel from "./components/AccountPanel";
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
  const base = resolveBo5ClubBase(proposal, club);

  if (!base) return "";

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

  // Padel Arena Południowa redirects incorrectly when BO5 query
  // parameters are appended to its public Padel URL.
  // Always open the clean Padel tab for this club.
  if (
    clubKey === "padel-arena-poludniowa" ||
    clubName.includes("padel-arena-poludniowa")
  ) {
    return "https://bo5.pl/padelARENApoludniowa/reservation/624/Padel";
  }

  const url = new URL(base);

  const disciplineId =
    BO5_DISCIPLINE_IDS[proposal?.clubSlug] ||
    BO5_DISCIPLINE_IDS[proposal?.blocks?.[0]?.clubSlug] ||
    BO5_DISCIPLINE_IDS[club?.slug] ||
    "";

  const clubId =
    disciplineId ||
    proposal?.clubId ||
    proposal?.blocks?.[0]?.clubId ||
    club?.id ||
    "";

  const courtId =
    proposal?.courtId ||
    proposal?.blocks?.[0]?.courtId ||
    "";

  const date =
    proposal?.date ||
    proposal?.blocks?.[0]?.date ||
    "";

  const hour =
    proposal?.startHour ||
    proposal?.blocks?.[0]?.startHour ||
    proposal?.blocks?.[0]?.time ||
    "";

  if (clubId) url.searchParams.set("cd", String(clubId));
  if (hour) url.searchParams.set("hour", String(hour));
  if (date) url.searchParams.set("date", String(date));
  if (courtId) url.searchParams.set("court", String(courtId));

  return url.toString();
}

function App() {
  const today = getToday();

  const [activeTab, setActiveTab] = useState("home");
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [matchCreateSignal, setMatchCreateSignal] = useState(0);
  const [playNowSignal, setPlayNowSignal] = useState(0);
  const [theme, setTheme] = useState(
    () => readStorage("padelalert-theme", "light")
  );

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
  const [myProfile, setMyProfile] = useState({ nickname: "Gość", level: "3.0", preferredSide: "Dowolna", favoriteClubSlug: "all", city: "Szczecin", bio: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [ownerPosts, setOwnerPosts] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState("");
  const knownNotificationIds = useRef(new Set());
  const notificationsInitialized = useRef(false);
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
      if (profileData.profile) setMyProfile(profileData.profile);
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
  }

  function createAlert() {
    setAlerts((current) => [
      {
        id: crypto.randomUUID(),
        club: clubSlug,
        date,
        from,
        to,
        duration,
        courtType
      },
      ...current
    ]);
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
      body: JSON.stringify(myProfile)
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
      <AccountPanel
                    user={accountUser}
                    anonymousToken={anonymousToken}
                    onAuthenticated={handleAuthenticated}
                    onLogout={handleLogout}
                  />
                  <RealtimeBadge status={realtimeStatus} />
      <button className="notification-bell-top" type="button" onClick={() => setActiveTab("saved")} title="Powiadomienia">🔔{unreadNotificationsCount > 0 && <span>{unreadNotificationsCount}</span>}</button>
      <aside className="sidebar">
        <button
          type="button"
          className="brand"
          onClick={() => setActiveTab("home")}
        >
          <span className="brand-mark">PA</span>

          <span>
            <strong>PadelAlert</strong>
            <small>Padel w jednym miejscu</small>
          </span>
        </button>

        <nav className="sidebar-nav">
          <span className="nav-caption">Menu</span>

          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? "active" : ""}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
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
          <span className="profile-avatar">{(myProfile.nickname || "G").slice(0, 1).toUpperCase()}</span>

          <div>
            <strong>{myProfile.nickname || "Gość"}</strong>
            <small>{myProfile.level || "Profil lokalny"}</small>
          </div>
        </div>

        <div className="sidebar-actions">
          <InstallAppButton />

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
            <span className="brand-mark">PA</span>
            <strong>PadelAlert</strong>
          </button>

          <div className="mobile-topbar-actions">
            <AccountPanel
              user={accountUser}
              anonymousToken={anonymousToken}
              onAuthenticated={handleAuthenticated}
              onLogout={handleLogout}
            />
            <RealtimeBadge status={realtimeStatus} />
            <InstallAppButton compact />

          <button
            type="button"
            className="mobile-theme"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "☾" : "☀"}
          </button>
          </div>
        </header>

        <main className="page">
          {activeTab === "home" && (
            <>
              <section className="welcome-row">
                <div>
                  <span className="eyebrow">PADELALERT DASHBOARD</span>
                  <h1>Dzień dobry, {myProfile.nickname || "Graczu"}! 👋</h1>
                  <p>
                    Sprawdź wolne korty i zobacz, kto szuka dzisiaj meczu.
                  </p>
                </div>

                <div className="live-update">
                  <span className="live-dot" />
                  Aktualizacja za {countdown}s
                </div>
              </section>

              <SmartLobby
                ownerToken={ownerToken}
                clubs={clubs}
                profile={myProfile}
                unreadNotificationsCount={unreadNotificationsCount}
                onOpenMatches={() => setActiveTab("matches")}
                onOpenCourts={() => setActiveTab("courts")}
                onOpenNotifications={() => setActiveTab("saved")}
              />

              <section className="hero-search-card">
                <div className="hero-search-copy">
                  <span>Znajdź kort</span>
                  <h2>Zarezerwuj najlepszy termin.</h2>
                  <p>
                    Porównujemy trzy kluby i pokazujemy tylko ciągłe bloki.
                  </p>
                </div>

                {renderSearchForm("dashboard-search")}
              </section>

              <section className="metric-grid">
                <article className="metric-card metric-green">
                  <span className="metric-icon">🎾</span>
                  <div>
                    <strong>{ranked.length}</strong>
                    <small>wolnych możliwości</small>
                  </div>
                </article>

                <article className="metric-card metric-blue">
                  <span className="metric-icon">◎</span>
                  <div>
                    <strong>{posts.length}</strong>
                    <small>zgłoszeń graczy</small>
                  </div>
                </article>

                <article className="metric-card metric-amber">
                  <span className="metric-icon">♡</span>
                  <div>
                    <strong>{favorites.length}</strong>
                    <small>ulubionych kortów</small>
                  </div>
                </article>

                <article className="metric-card metric-red">
                  <span className="metric-icon">◉</span>
                  <div>
                    <strong>{alerts.length}</strong>
                    <small>aktywnych alertów</small>
                  </div>
                </article>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">Najlepsze teraz</span>
                    <h2>Polecane terminy</h2>
                  </div>

                  <button onClick={() => setActiveTab("courts")}>
                    Wszystkie wyniki →
                  </button>
                </div>

                <div className="recommendation-grid">
                  {topRecommendations.map((item, index) => (
                    <article
                      className={`recommendation-card card-${index + 1}`}
                      key={`${item.courtKey}-${item.startHour}`}
                    >
                      <div className="recommendation-head">
                        <span>#{index + 1} · {item.score}%</span>

                        <button onClick={() => toggleFavorite(item.courtKey)}>
                          {favorites.includes(item.courtKey) ? "♥" : "♡"}
                        </button>
                      </div>

                      <div className="recommendation-time">
                        {item.startHour}–{item.endHour}
                      </div>

                      <h3>{item.courtName}</h3>
                      <p>{item.clubName}</p>

                      <div className="tag-row">
                        <span>{duration} min</span>
                        <span>
                          {item.courtType === "outdoor"
                            ? "Zewnętrzny"
                            : "Wewnętrzny"}
                        </span>
                      </div>

                      <button
                        className="primary-card-button"
                        onClick={() => {
                          setSelectedProposal(item);
                          setActiveTab("courts");
                        }}
                      >
                        Wybierz termin
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="section-block v5-fade">
                <div className="section-heading">
                  <div><span className="section-kicker">Kluby premium</span><h2>Wybierz miejsce do gry</h2></div>
                </div>
                <div className="club-showcase">
                  {clubStats.slice(0, 3).map((club) => (
                    <article className="club-showcase-card" key={club.slug} onClick={() => { setClubSlug(club.slug); setActiveSearch({ ...activeSearch, club: club.slug }); setActiveTab("courts"); }}>
                      <small>{Object.keys(club.courts || {}).length} kortów</small>
                      <h3>{club.name}</h3>
                      <span className="club-count">{club.available}</span>
                      <strong>wolnych możliwości</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="section-block v5-fade">
                <div className="section-heading">
                  <div><span className="section-kicker">Smart Match</span><h2>Najlepiej dopasowani partnerzy</h2></div>
                  <button onClick={() => setActiveTab("partners")}>Wszyscy gracze →</button>
                </div>
                {smartMatches.length > 0 ? (
                  <div className="smart-match-grid">
                    {smartMatches.map((post) => (
                      <article className="smart-match-card" key={post.id}>
                        <div className="smart-match-score"><span className="section-kicker">Dopasowanie</span><strong>{post.match}%</strong></div>
                        <div className="smart-match-profile">
                          <span className="large-avatar colorful-avatar" style={{ "--avatar-hue": getAvatarHue(post.nickname) }}>{post.nickname.slice(0,1).toUpperCase()}</span>
                          <div><h3>{post.nickname}</h3><p>{post.preferredSide || "Dowolna"}</p><LevelBadge level={post.level} compact /></div>
                        </div>
                        <div className="smart-match-tags"><span>{post.clubName}</span><span>{post.from}–{post.to}</span><span>{formatShortDate(post.date)}</span></div>
                        <button onClick={() => openJoinRequest(post)}>Zaproś do meczu</button>
                      </article>
                    ))}
                  </div>
                ) : <div className="empty-state">Dodaj profil i poczekaj na zgłoszenia graczy — Smart Match pojawi się automatycznie.</div>}
              </section>

              <section className="section-block v5-fade">
                <div className="profile-summary-card">
                  <span className="large-avatar colorful-avatar" style={{ "--avatar-hue": getAvatarHue(myProfile.nickname || "G") }}>{(myProfile.nickname || "G").slice(0,1).toUpperCase()}</span>
                  <div><span className="section-kicker">Twój profil</span><h3>{myProfile.nickname || "Uzupełnij profil"}</h3><p>{myProfile.level || "Brak poziomu"} · {myProfile.preferredSide || "Dowolna strona"} · {myProfile.city || "Szczecin"}</p></div>
                  <button onClick={() => setActiveTab("saved")}>Edytuj profil</button>
                </div>
              </section>

              <section className="dashboard-columns">
                <section className="panel">
                  <div className="section-heading compact">
                    <div>
                      <span className="section-kicker">Kluby</span>
                      <h2>Dostępność</h2>
                    </div>
                  </div>

                  <div className="club-ranking">
                    {clubStats.map((club, index) => (
                      <article key={club.slug}>
                        <span className="rank-number">{index + 1}</span>

                        <div>
                          <strong>{club.name}</strong>
                          <small>
                            {Object.keys(club.courts || {}).length} kortów
                          </small>
                        </div>

                        <div className="availability">
                          <strong>{club.available}</strong>
                          <small>opcji</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <div className="section-heading compact">
                    <div>
                      <span className="section-kicker">Społeczność</span>
                      <h2>Szukają meczu</h2>
                    </div>

                    <button onClick={() => setActiveTab("partners")}>
                      Więcej
                    </button>
                  </div>

                  <div className="partner-preview">
                    {posts.slice(0, 4).map((post) => (
                      <article key={post.id}>
                        <span className="small-avatar">
                          {post.nickname.slice(0, 1).toUpperCase()}
                        </span>

                        <div>
                          <strong>{post.nickname}</strong>
                          <small>
                            {post.level} · {post.clubName}
                          </small>
                          <p>
                            {formatShortDate(post.date)} · {post.from}–
                            {post.to}
                          </p>
                        </div>

                        <button onClick={() => copyPlayerContact(post)}>
                          Zaproś
                        </button>
                      </article>
                    ))}

                    {posts.length === 0 && (
                      <div className="empty-state">
                        Brak ogłoszeń. Dodaj pierwsze zgłoszenie.
                      </div>
                    )}
                  </div>
                </section>
              </section>
            </>
          )}

          {activeTab === "courts" && (
            <>
              <section className="page-heading">
                <span className="eyebrow">WOLNE KORTY</span>
                <h1>Znajdź najlepszy termin.</h1>
                <p>
                  Ustaw klub, datę i czas gry. Pokażemy tylko pełne bloki.
                </p>
              </section>

              {renderSearchForm()}

              <div className="toolbar">
                <button onClick={saveSearch}>☆ Zapisz</button>
                <button onClick={createAlert}>◉ Utwórz alert</button>
                <button onClick={loadAvailability}>↻ Odśwież</button>

                <label>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) =>
                      setAutoRefresh(event.target.checked)
                    }
                  />
                  Auto {autoRefresh ? `${countdown}s` : "wyłączone"}
                </label>
              </div>

              {loading && (
                <div className="loading-grid">
                  {[1, 2, 3].map((item) => (
                    <div className="loading-card" key={item} />
                  ))}
                </div>
              )}

              {error && <div className="error-box">{error}</div>}

              {!loading && !error && topRecommendations.length > 0 && (
                <section className="section-block">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">Smart ranking</span>
                      <h2>Najlepsze propozycje</h2>
                    </div>
                  </div>

                  <div className="recommendation-grid">
                    {topRecommendations.map((item, index) => (
                      <article
                        className={`recommendation-card card-${index + 1}`}
                        key={`${item.courtKey}-${item.startHour}`}
                      >
                        <div className="recommendation-head">
                          <span>#{index + 1} · {item.score}%</span>

                          <button
                            onClick={() => toggleFavorite(item.courtKey)}
                          >
                            {favorites.includes(item.courtKey) ? "♥" : "♡"}
                          </button>
                        </div>

                        <div className="recommendation-time">
                          {item.startHour}–{item.endHour}
                        </div>

                        <h3>{item.courtName}</h3>
                        <p>{item.clubName}</p>

                        <button
                          className="primary-card-button"
                          onClick={() => setSelectedProposal(item)}
                        >
                          Wybierz
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!loading && !error && groupedProposals.length > 0 && (
                <section className="section-block">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">Pełna lista</span>
                      <h2>Dostępne przedziały</h2>
                    </div>
                  </div>

                  <div className="time-groups">
                    {groupedProposals.map((proposal) => (
                      <article
                        className="time-group"
                        key={`${proposal.startHour}-${proposal.endHour}`}
                      >
                        <header>
                          <div>
                            <span>Godzina gry</span>
                            <h3>
                              {proposal.startHour}–{proposal.endHour}
                            </h3>
                          </div>

                          <span className="count-pill">
                            {proposal.courts.length} korty
                          </span>
                        </header>

                        <div className="court-grid">
                          {proposal.courts.map((court) => (
                            <button
                              key={`${proposal.startHour}-${court.courtKey}`}
                              onClick={() =>
                                setSelectedProposal({
                                  ...court,
                                  startHour: proposal.startHour,
                                  endHour: proposal.endHour
                                })
                              }
                            >
                              <span className="court-line" />

                              <span>
                                <strong>{court.courtName}</strong>
                                <small>{court.clubName}</small>
                              </span>

                              <span>Wybierz →</span>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!loading &&
                !error &&
                groupedProposals.length === 0 && (
                  <div className="empty-state large">
                    Brak pasujących terminów. Zmień godzinę lub czas gry.
                  </div>
                )}

              {selectedProposal && (
                <section className="booking-bar">
                  <div>
                    <span>Twój wybór</span>
                    <strong>{selectedProposal.courtName}</strong>
                    <small>
                      {selectedProposal.clubName} ·{" "}
                      {formatDate(activeSearch.date)} ·{" "}
                      {selectedProposal.startHour}–
                      {selectedProposal.endHour}
                    </small>
                  </div>

                  <div className="booking-hint">
                    BO5 otworzy właściwy klub i termin. Na stronie BO5 kliknij
                    wskazany kort o {selectedProposal.startHour}.
                  </div>

                  <div className="booking-bar-actions">
                    <button onClick={() => setSelectedProposal(null)}>
                      Zmień
                    </button>

                    <button
                      className="booking-create-match"
                      onClick={() => {
                        setActiveTab("matches");
                        setMatchCreateSignal((value) => value + 1);
                        setToast(
                          `Wybrano ${selectedProposal.courtName}, ${selectedProposal.startHour}–${selectedProposal.endHour}. Utwórz mecz dla tego terminu.`
                        );
                      }}
                    >
                      ＋ Utwórz mecz
                    </button>

                    <a
                      className="booking-bo5-button"
                      href={buildBo5DeepLink(
                        selectedProposal,
                        selectedClub
                      ) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        const href = buildBo5DeepLink(
                          selectedProposal,
                          selectedClub
                        );

                        if (!href) {
                          event.preventDefault();
                          setToast(
                            "Nie udało się przygotować linku do BO5."
                          );
                          return;
                        }

                        setToast(
                          `BO5 otworzy właściwy klub i termin. Kliknij tam ${selectedProposal.courtName} o ${selectedProposal.startHour}.`
                        );
                      }}
                    >
                      Przejdź do BO5 ↗
                    </a>
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === "matches" && (
            <MatchPage
              ownerToken={ownerToken}
              clubs={clubs}
              profile={myProfile}
              onChanged={loadCommunity}
              createSignal={matchCreateSignal}
              playNowSignal={playNowSignal}
            />
          )}

          {activeTab === "partners" && (
            <>
              <section className="partners-heading partners-heading-premium">
                <div>
                  <span className="eyebrow">SPOŁECZNOŚĆ</span>
                  <h1>Znajdź partnera do meczu.</h1>
                  <p>
                    Przefiltruj graczy po klubie, poziomie i godzinie albo
                    dodaj własną dyspozycyjność.
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
                              className="large-avatar colorful-avatar"
                              style={{
                                "--avatar-hue": getAvatarHue(post.nickname)
                              }}
                            >
                              {post.nickname.slice(0, 1).toUpperCase()}
                            </span>

                            <div>
                              <h3>{post.nickname}</h3>
                              <p>
                                Preferowana strona:{" "}
                                {post.preferredSide || "Dowolna"}
                              </p>
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

                            <button
                              className="primary-action"
                              onClick={() => copyPlayerContact(post)}
                            >
                              Zaproś do meczu
                            </button>
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
                            className="small-avatar colorful-avatar"
                            style={{
                              "--avatar-hue": getAvatarHue(profile.nickname)
                            }}
                          >
                            {profile.nickname.slice(0, 1).toUpperCase()}
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

          {activeTab === "saved" && (
            <>
              <section className="page-heading my-center-heading">
                <span className="eyebrow">TWOJE CENTRUM</span>
                <h1>Profil, mecze i powiadomienia.</h1>
                <p>Wszystko, co dotyczy Twojej aktywności w PadelAlert.</p>
              </section>

              <div className="my-center-grid">
                <form className="profile-editor-panel" onSubmit={saveProfile}>
                  <div className="profile-editor-head">
                    <span
                      className="profile-editor-avatar colorful-avatar"
                      style={{ "--avatar-hue": getAvatarHue(myProfile.nickname) }}
                    >
                      {(myProfile.nickname || "G").slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <span className="section-kicker">Twój profil</span>
                      <h2>{myProfile.nickname || "Gość"}</h2>
                    </div>
                  </div>

                  <div className="profile-form-grid">
                    <label><span>Pseudonim</span><input value={myProfile.nickname || ""} onChange={(e) => setMyProfile({ ...myProfile, nickname: e.target.value })} /></label>
                    <label><span>Miasto</span><input value={myProfile.city || ""} onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })} /></label>
                    <label><span>Poziom</span><LevelSelect value={myProfile.level || "3.0"} onChange={(value) => setMyProfile({ ...myProfile, level: value })} /></label>
                    <label><span>Strona</span><select value={myProfile.preferredSide || "Dowolna"} onChange={(e) => setMyProfile({ ...myProfile, preferredSide: e.target.value })}><option>Dowolna</option><option>Lewa</option><option>Prawa</option></select></label>
                    <label className="profile-wide"><span>Ulubiony klub</span><select value={myProfile.favoriteClubSlug || "all"} onChange={(e) => setMyProfile({ ...myProfile, favoriteClubSlug: e.target.value })}><option value="all">Brak / dowolny</option>{clubs.map((club) => <option key={club.slug} value={club.slug}>{club.name}</option>)}</select></label>
                    <label className="profile-wide"><span>O mnie</span><textarea value={myProfile.bio || ""} onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })} placeholder="Np. gram rekreacyjnie po pracy." /></label>
                  </div>
                  {profileMessage && <div className="form-message">{profileMessage}</div>}
                  <button className="profile-save-button" type="submit">Zapisz profil</button>
                </form>

                <section className="notifications-panel">
                  <div className="notifications-head">
                    <div><span className="section-kicker">Powiadomienia</span><h2>{unreadNotificationsCount} nowych</h2></div>
                    <div className="notification-head-actions">
                      <button onClick={enableSystemNotifications}>Włącz powiadomienia</button>
                      <button onClick={markAllNotificationsRead}>Oznacz jako przeczytane</button>
                    </div>
                  </div>
                  <div className="notification-list">
                    {notifications.slice(0, 8).map((notification) => (
                      <article
                        className={notification.read ? "read" : ""}
                        key={notification.id}
                        onClick={markAllNotificationsRead}
                      >
                        <span className="notification-dot" />
                        <div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString("pl-PL")}</small></div>
                      </article>
                    ))}
                    {notifications.length === 0 && <div className="empty-state">Brak powiadomień.</div>}
                  </div>
                </section>
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
                  {ownerPosts.length === 0 && <div className="empty-state large">Nie masz jeszcze własnych zgłoszeń.</div>}
                </div>
              </section>

              <div className="saved-grid secondary-saved-grid">
                <section className="saved-panel">
                  <h2>Moje wysłane zgłoszenia</h2>
                  {outgoingRequests.map((request) => <article key={request.id}><div><strong>{request.post?.nickname || "Gracz"}</strong><small>{request.post?.clubName} · {request.post?.date} · status: {request.status}</small></div></article>)}
                  {outgoingRequests.length === 0 && <div className="empty-state">Nie wysłano jeszcze zaproszeń.</div>}
                </section>
                <section className="saved-panel">
                  <h2>Alerty kortów</h2>
                  {alerts.map((alert) => <article key={alert.id}><div><strong>{alert.club}</strong><small>{alert.date} · {alert.from}–{alert.to} · {alert.duration} min</small></div><button onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}>Usuń</button></article>)}
                  {alerts.length === 0 && <div className="empty-state">Nie masz aktywnych alertów.</div>}
                </section>
              </div>
            </>
          )}
        </main>

        <button
          type="button"
          className="mobile-global-action"
          onClick={() => setShowMobileActions(true)}
          aria-label="Szybkie akcje"
        >
          ＋
        </button>

        <nav className="mobile-bottom-nav">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              className={activeTab === item.id ? "active" : ""}
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
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

      <MobileQuickActions
        open={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        onCreateMatch={() => {
          setShowMobileActions(false);
          setActiveTab("matches");
          setMatchCreateSignal((value) => value + 1);
        }}
        onPlayNow={() => {
          setShowMobileActions(false);
          setActiveTab("matches");
          setPlayNowSignal((value) => value + 1);
        }}
        onFindCourt={() => {
          setShowMobileActions(false);
          setActiveTab("courts");
        }}
      />

      {toast && (
        <button
          type="button"
          className="app-toast"
          onClick={() => {
            setActiveTab("saved");
            setToast("");
          }}
        >
          <span className="app-toast-icon">🔔</span>
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
