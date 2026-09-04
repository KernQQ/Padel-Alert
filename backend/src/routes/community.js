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
        broadcast("community.changed", {
          method: req.method,
          path: req.originalUrl
        });
      }
    });
  }

  next();
});


function clean(value, maxLength = 200) { return String(value || "").trim().slice(0, maxLength); }
function isValidTime(value) { return /^\d{2}:\d{2}$/.test(String(value || "")); }
function normalizeProfileLevel(value, fallback = "3.0") {
  const numeric = Number.parseFloat(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numeric)) return fallback;
  const normalized = numeric.toFixed(1);
  const allowed = new Set(["1.5","2.0","2.5","3.0","3.1","3.2","3.3","3.4","3.5","3.6","3.7","3.8","3.9","4.0","4.5","5.0","5.5","6.0"]);
  return allowed.has(normalized) ? normalized : fallback;
}
function token(req) { return clean(req.headers["x-owner-token"], 100); }
function requireToken(req, res) { const value = token(req); if (!value) { res.status(401).json({ ok:false, message:"Brak identyfikatora użytkownika." }); return null; } return value; }
function publicPost(post, requester, requests, profiles = {}) {
  const { ownerToken, ...rest } = post;
  const profile = profiles[ownerToken] || {};
  return {
    ...rest,
    nickname: rest.nickname || profile.nickname || "Gracz",
    preferredSide: rest.preferredSide || profile.preferredSide || "Dowolna",
    avatarDataUrl: profile.avatarDataUrl || "",
    city: profile.city || "Szczecin",
    availabilityPeriods: Array.isArray(profile.availabilityPeriods) ? profile.availabilityPeriods : [],
    favoriteClubSlugs: Array.isArray(profile.favoriteClubSlugs) ? profile.favoriteClubSlugs : [],
    canDelete: Boolean(requester && ownerToken === requester),
    canManage: Boolean(requester && ownerToken === requester),
    requestsCount: requests.filter(r => r.postId === post.id).length
  };
}
function notify(data, ownerToken, title, message, type="info") { data.notifications.unshift({ id:randomUUID(), ownerToken, title, message, type, read:false, createdAt:new Date().toISOString() }); sendPush(data, ownerToken, { title, body: message, url: "/" }); }

function warsawTimestamp(date, time) {
  if (!date || !time) return NaN;

  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return NaN;

  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const offsetPart = formatter
    .formatToParts(guess)
    .find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";

  const match = offsetPart.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return guess.getTime();

  const sign = match[1] === "+" ? 1 : -1;
  const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));

  return Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60000;
}

function postEndTimestamp(post) {
  if (!post?.date || !post?.to) return NaN;
  return warsawTimestamp(post.date, post.to);
}

function cleanupCommunity(data) {
  const now = Date.now();

  (data.posts || []).forEach((post) => {
    if (post.status !== "open") return;

    const endAt = postEndTimestamp(post);

    if (Number.isFinite(endAt) && endAt < now) {
      post.status = "closed";
      post.autoClosed = true;
      post.archivedAt = post.archivedAt || new Date().toISOString();
      post.updatedAt = new Date().toISOString();
    }
  });

  // Nie trzymamy w nieskończoność starych przeczytanych komunikatów.
  const notificationCutoff = now - 45 * 24 * 60 * 60 * 1000;

  data.notifications = (data.notifications || []).filter((notification) => {
    if (!notification.read) return true;

    const createdAt = new Date(notification.createdAt).getTime();

    return (
      !Number.isFinite(createdAt) ||
      createdAt >= notificationCutoff
    );
  });
}

router.get("/profiles", async (req, res) => {
  const data = await readStore();
  const now = Date.now();
  const cutoff = now - 3 * 60 * 1000;
  const profiles = Object.entries(data.profiles || {})
    .filter(([id]) => {
      const seen = new Date(data.presence?.[id]?.lastSeenAt || 0).getTime();
      return Number.isFinite(seen) && seen >= cutoff;
    })
    .map(([id, profile]) => ({ ...profile, id, online: true, lastSeenAt: data.presence?.[id]?.lastSeenAt }))
    .sort((a,b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
  res.json({ ok:true, profiles });
});

router.post("/presence", async (req, res) => {
  const id = requireToken(req, res);
  if (!id) return;
  const result = await updateStore((data) => {
    if (!data.users?.[id]) return { error:[401, "Zaloguj się ponownie."] };
    data.presence ||= {};
    data.presence[id] = { lastSeenAt: new Date().toISOString() };
    return { ok:true };
  });
  if (result?.error) return res.status(result.error[0]).json({ ok:false, message:result.error[1] });
  res.json({ ok:true });
});
router.get("/me", async (req, res) => { const id=requireToken(req,res); if(!id)return; const data=await readStore(); res.json({ok:true,profile:data.profiles[id] || { nickname:"Gość", level:"3.0", preferredSide:"Dowolna", favoriteClubSlug:"all", favoriteClubSlugs:[], availabilityPeriods:[], city:"Szczecin", bio:"" }}); });
router.patch("/me", async (req, res) => {
  const id=requireToken(req,res); if(!id)return;
  const profile=await updateStore(data => {
    const current=data.profiles[id]||{};
    let avatarDataUrl = current.avatarDataUrl || "";
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "avatarDataUrl")) {
      const candidate = String(req.body.avatarDataUrl || "");
      if (candidate && !/^data:image\/(jpeg|png|webp);base64,/i.test(candidate)) {
        return { error:[400,"Nieprawidłowy format zdjęcia profilowego."] };
      }
      if (candidate.length > 900000) {
        return { error:[413,"Zdjęcie profilowe jest za duże."] };
      }
      avatarDataUrl = candidate;
    }
    const favoriteClubSlugs = Array.isArray(req.body.favoriteClubSlugs)
      ? req.body.favoriteClubSlugs.map((value) => clean(value, 80)).filter(Boolean).slice(0, 5)
      : (Array.isArray(current.favoriteClubSlugs) ? current.favoriteClubSlugs : []);
    const availabilityPeriods = Array.isArray(req.body.availabilityPeriods)
      ? req.body.availabilityPeriods.map((value) => clean(value, 24)).filter((value) => ["Rano", "Popołudnie", "Wieczór"].includes(value)).slice(0, 3)
      : (Array.isArray(current.availabilityPeriods) ? current.availabilityPeriods : []);
    const next={...current,id,nickname:clean(req.body.nickname||"Gość",50),level:normalizeProfileLevel(req.body.level, current.level || "3.0"),preferredSide:clean(req.body.preferredSide||"Dowolna",20),favoriteClubSlug:clean(req.body.favoriteClubSlug||favoriteClubSlugs[0]||"all",80),favoriteClubSlugs,availabilityPeriods,city:clean(req.body.city||"Szczecin",60),bio:clean(req.body.bio,300),avatarDataUrl,updatedAt:new Date().toISOString()};
    data.profiles[id]=next; return { profile: next };
  });
  if (profile?.error) return res.status(profile.error[0]).json({ok:false,message:profile.error[1]});
  res.json({ok:true,profile:profile.profile});
});

router.get("/posts", async (req, res) => { const data=await updateStore(store=>{ cleanupCommunity(store); return store; }); const requester=token(req); const {clubSlug,date,level,kind,status="open"}=req.query; let posts=data.posts.map(p=>publicPost(p,requester,data.requests,data.profiles)); if(status!=="all")posts=posts.filter(p=>p.status===status); if(clubSlug&&clubSlug!=="all")posts=posts.filter(p=>p.clubSlug===clubSlug||p.clubSlug==="all"); if(date)posts=posts.filter(p=>p.date===date); if(level&&level!=="all")posts=posts.filter(p=>p.level===level); if(kind&&kind!=="all")posts=posts.filter(p=>p.kind===kind); posts.sort((a,b)=>`${a.date}T${a.from}`.localeCompare(`${b.date}T${b.from}`)); res.json({ok:true,count:posts.length,posts}); });

router.post("/posts", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const {nickname,contact,clubSlug,clubName,date,from,to,level,preferredSide,flexibleHours,playersNeeded,note,kind="player-looking-for-match"}=req.body||{}; if(!nickname||!contact||!clubSlug||!date||!from||!to)return res.status(400).json({ok:false,message:"Uzupełnij pseudonim, kontakt, klub, datę oraz godziny."}); if(!isValidTime(from)||!isValidTime(to)||from>=to)return res.status(400).json({ok:false,message:"Sprawdź zakres godzin."}); const post=await updateStore(data=>{ const item={id:randomUUID(),kind:clean(kind,50),nickname:clean(nickname,50),contact:clean(contact,120),clubSlug:clean(clubSlug,80),clubName:clean(clubName||(clubSlug==="all"?"Dowolny klub":clubSlug),100),date:clean(date,10),from:clean(from,5),to:clean(to,5),level:clean(level||"3.0",40),preferredSide:clean(preferredSide||"Dowolna",20),flexibleHours:Boolean(flexibleHours),playersNeeded:Math.max(1,Math.min(3,Number(playersNeeded)||1)),note:clean(note,300),status:"open",ownerToken:owner,createdAt:new Date().toISOString()}; data.posts.push(item); notify(data,owner,"Zgłoszenie opublikowane",`${item.clubName}, ${item.date} ${item.from}–${item.to}`); return item; }); res.status(201).json({ok:true,post}); });

router.post("/posts/:id/join", async (req, res) => { const requester=requireToken(req,res); if(!requester)return; const {nickname,contact,message}=req.body||{}; if(!nickname||!contact)return res.status(400).json({ok:false,message:"Podaj pseudonim i kontakt."}); const result=await updateStore(data=>{ const post=data.posts.find(p=>p.id===req.params.id); if(!post)return {error:[404,"Nie znaleziono zgłoszenia."]}; if(post.status!=="open")return {error:[400,"To zgłoszenie nie jest już aktywne."]}; if(post.ownerToken===requester)return {error:[400,"Nie możesz zgłosić się do własnego meczu."]}; if(data.requests.some(r=>r.postId===post.id&&r.requesterToken===requester&&r.status!=="rejected"))return {error:[409,"Już zgłosiłeś się do tego meczu."]}; const request={id:randomUUID(),postId:post.id,requesterToken:requester,nickname:clean(nickname,50),contact:clean(contact,120),message:clean(message,250),status:"pending",createdAt:new Date().toISOString()}; data.requests.push(request); notify(data,post.ownerToken,"Nowy gracz zainteresowany",`${request.nickname} chce dołączyć do gry w ${post.clubName}.`,"request"); return {request}; }); if(result.error)return res.status(result.error[0]).json({ok:false,message:result.error[1]}); res.status(201).json({ok:true,request:result.request}); });

router.get("/owner/posts", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const data=await updateStore(store=>{ cleanupCommunity(store); return store; }); const posts=data.posts.filter(p=>p.ownerToken===owner).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(p=>({...publicPost(p,owner,data.requests,data.profiles),requests:data.requests.filter(r=>r.postId===p.id).map(({requesterToken,...r})=>r)})); res.json({ok:true,posts}); });
router.get("/requests/outgoing", async (req, res) => { const requester=requireToken(req,res); if(!requester)return; const data=await readStore(); const requests=data.requests.filter(r=>r.requesterToken===requester).map(r=>{const {requesterToken,...publicRequest}=r; const post=data.posts.find(p=>p.id===r.postId); return {...publicRequest,post:post?publicPost(post,requester,data.requests,data.profiles):null};}); res.json({ok:true,requests}); });
router.patch("/requests/:id", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const status=clean(req.body.status,20); if(!["accepted","rejected"].includes(status))return res.status(400).json({ok:false,message:"Nieprawidłowy status."}); const result=await updateStore(data=>{ const request=data.requests.find(r=>r.id===req.params.id); if(!request)return {error:[404,"Nie znaleziono zgłoszenia gracza."]}; const post=data.posts.find(p=>p.id===request.postId); if(!post||post.ownerToken!==owner)return {error:[403,"Nie możesz zarządzać tym zgłoszeniem."]}; request.status=status; request.updatedAt=new Date().toISOString(); notify(data,request.requesterToken,status==="accepted"?"Dołączasz do meczu!":"Odpowiedź na zgłoszenie",status==="accepted"?`${post.nickname} zaakceptował Twoje zgłoszenie. Kontakt: ${post.contact}`:`${post.nickname} nie zaakceptował zgłoszenia do tego meczu.`,"request-status"); return {request}; }); if(result.error)return res.status(result.error[0]).json({ok:false,message:result.error[1]}); res.json({ok:true,request:result.request}); });

router.patch("/posts/:id/status", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const status=clean(req.body.status,20); if(!["open","closed","cancelled"].includes(status))return res.status(400).json({ok:false,message:"Nieprawidłowy status."}); const result=await updateStore(data=>{const post=data.posts.find(p=>p.id===req.params.id); if(!post)return {error:[404,"Nie znaleziono zgłoszenia."]}; if(post.ownerToken!==owner)return {error:[403,"Nie możesz zmienić tego zgłoszenia."]}; post.status=status; post.updatedAt=new Date().toISOString(); return {post};}); if(result.error)return res.status(result.error[0]).json({ok:false,message:result.error[1]}); res.json({ok:true,post:result.post}); });

router.patch("/posts/:id", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const {nickname,contact,clubSlug,clubName,date,from,to,level,preferredSide,flexibleHours,note}=req.body||{}; if(!nickname||!contact||!clubSlug||!date||!from||!to)return res.status(400).json({ok:false,message:"Uzupełnij wszystkie wymagane pola."}); if(!isValidTime(from)||!isValidTime(to)||from>=to)return res.status(400).json({ok:false,message:"Sprawdź zakres godzin."}); const result=await updateStore(data=>{const post=data.posts.find(p=>p.id===req.params.id); if(!post)return {error:[404,"Nie znaleziono zgłoszenia."]}; if(post.ownerToken!==owner)return {error:[403,"Możesz edytować tylko własne zgłoszenie."]}; Object.assign(post,{nickname:clean(nickname,50),contact:clean(contact,120),clubSlug:clean(clubSlug,80),clubName:clean(clubName,100),date:clean(date,10),from:clean(from,5),to:clean(to,5),level:clean(level,40),preferredSide:clean(preferredSide,20),flexibleHours:Boolean(flexibleHours),note:clean(note,300),updatedAt:new Date().toISOString()}); return {post};}); if(result.error)return res.status(result.error[0]).json({ok:false,message:result.error[1]}); res.json({ok:true,post:result.post}); });

router.delete("/posts/:id", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const result=await updateStore(data=>{const post=data.posts.find(p=>p.id===req.params.id); if(!post)return {error:[404,"Nie znaleziono zgłoszenia."]}; if(post.ownerToken!==owner)return {error:[403,"Możesz usunąć tylko własne zgłoszenie."]}; data.posts=data.posts.filter(p=>p.id!==post.id); data.requests=data.requests.filter(r=>r.postId!==post.id); return {ok:true};}); if(result.error)return res.status(result.error[0]).json({ok:false,message:result.error[1]}); res.json({ok:true}); });

router.get("/notifications", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; const data=await updateStore(store=>{ cleanupCommunity(store); return store; }); res.json({ok:true,notifications:data.notifications.filter(n=>n.ownerToken===owner).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}); });
router.patch("/notifications/read-all", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; await updateStore(data=>data.notifications.forEach(n=>{if(n.ownerToken===owner)n.read=true;})); res.json({ok:true}); });
router.delete("/notifications", async (req, res) => { const owner=requireToken(req,res); if(!owner)return; await updateStore(data=>{ data.notifications=(data.notifications||[]).filter(n=>n.ownerToken!==owner); }); res.json({ok:true}); });

module.exports = router;
