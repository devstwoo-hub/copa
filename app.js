const SUPABASE_URL = "https://zlqsmhlutktkeggqnaox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscXNtaGx1dGt0a2VnZ3FuYW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDEyNTQsImV4cCI6MjA5NjU3NzI1NH0.T2Wnrp3tZvZaUDaETYLslidWb2i3leaa-Ioj8SJXg-c";
const ADMIN_CODE = "admin2026";

let page = new URLSearchParams(location.search).get("screen") || document.body.dataset.page;
const configured = SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 30;
const client = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const sessionKey = "bolao_participant";
const bettingCutoffMs = 60 * 60 * 1000;
let draftPredictions = new Map();
let currentParticipant = null;
let currentMatches = [];
let currentPredictions = [];
const teamTranslations = {
  Mexico: "México",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  Czechia: "Tchéquia",
  Canada: "Canadá",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  Qatar: "Catar",
  Switzerland: "Suíça",
  Brazil: "Brasil",
  Morocco: "Marrocos",
  Scotland: "Escócia",
  "United States": "Estados Unidos",
  Paraguay: "Paraguai",
  Australia: "Austrália",
  Turkiye: "Turquia",
  "Ivory Coast": "Costa do Marfim",
  Ecuador: "Equador",
  Germany: "Alemanha",
  Curacao: "Curaçao",
  Netherlands: "Países Baixos",
  Japan: "Japão",
  Sweden: "Suécia",
  Tunisia: "Tunísia",
  Iran: "Irã",
  "New Zealand": "Nova Zelândia",
  Belgium: "Bélgica",
  Egypt: "Egito",
  "Saudi Arabia": "Arábia Saudita",
  Uruguay: "Uruguai",
  Spain: "Espanha",
  "Cape Verde": "Cabo Verde",
  France: "França",
  Iraq: "Iraque",
  Norway: "Noruega",
  Algeria: "Argélia",
  Austria: "Áustria",
  Jordan: "Jordânia",
  "DR Congo": "RD Congo",
  Uzbekistan: "Uzbequistão",
  Colombia: "Colômbia",
  Ghana: "Gana",
  Panama: "Panamá",
  England: "Inglaterra",
  Croatia: "Croácia",
};

const $ = (selector) => document.querySelector(selector);

function pageUrl(pageName) {
  if (pageName === "index") return location.hostname === "127.0.0.1" || location.hostname === "localhost" ? "./index.html" : "/";
  return `${pageUrl("index")}?screen=${pageName}`;
}

function mountAppShell() {
  document.body.dataset.page = "app";
  document.body.innerHTML = `
    <header class="topbar">
      <a class="brand compact" href="${pageUrl("app")}">
        <span class="brand-mark">B</span>
        <strong>Bolao da Copa</strong>
      </a>
      <nav class="nav-actions">
        <a id="admin-link" class="ghost hidden" href="${pageUrl("admin")}">Admin</a>
        <button id="signout" class="ghost" type="button">Sair</button>
      </nav>
    </header>

    <main class="layout">
      <section class="panel">
        <div class="section-head">
          <div>
            <h1>Meus palpites</h1>
            <p>Escolha quem vence ou marque empate antes do jogo comecar.</p>
          </div>
          <button id="save-predictions" class="primary" type="button">Salvar palpites</button>
        </div>
        <div id="phase-tabs" class="phase-tabs" aria-label="Filtrar fase"></div>
        <p id="prediction-message" class="message" aria-live="polite"></p>
        <div id="matches" class="matches"></div>
      </section>

      <aside class="side">
        <section class="panel">
          <h2>Meu perfil</h2>
          <div id="profile-card" class="profile-card"></div>
        </section>
        <section class="panel">
          <div class="section-head tight">
            <h2>Ranking</h2>
            <span id="user-name" class="pill"></span>
          </div>
          <div id="ranking" class="ranking"></div>
        </section>
        <section class="panel small-copy">
          <h2>Regra</h2>
          <p>Acertou o vencedor ou empate, ganha 1 ponto. Errou, 0 ponto.</p>
        </section>
        <section class="panel">
          <h2>Meu histórico</h2>
          <div id="history" class="history"></div>
        </section>
      </aside>
    </main>
  `;
}

function mountAdminShell() {
  document.body.dataset.page = "admin";
  document.body.innerHTML = `
    <header class="topbar">
      <a class="brand compact" href="${pageUrl("app")}">
        <span class="brand-mark">B</span>
        <strong>Bolao da Copa</strong>
      </a>
      <nav class="nav-actions">
        <a class="ghost" href="${pageUrl("app")}">Palpites</a>
        <button id="signout" class="ghost" type="button">Sair</button>
      </nav>
    </header>

    <main class="layout admin-layout">
      <section class="panel">
        <div class="section-head">
          <div>
            <h1>Resultados</h1>
            <p>Escolha o resultado final de cada jogo para liberar a pontuacao no ranking.</p>
          </div>
        </div>
        <div id="admin-matches" class="admin-list"></div>
      </section>

      <aside class="side">
        <section class="panel">
          <h2>Participantes</h2>
          <div id="participants-list" class="participants-list"></div>
        </section>
        <section class="panel">
          <h2>Importar jogos</h2>
          <p class="muted">Cole CSV com: match_no,phase,stage,kickoff_at,home_team,away_team,venue.</p>
          <textarea id="csv-input" rows="10" placeholder="1,Primeira fase,Grupo A,2026-06-11T20:00:00Z,Mexico,Africa do Sul,Estadio Azteca"></textarea>
          <button id="import-csv" class="primary" type="button">Importar CSV</button>
          <p id="admin-message" class="message" aria-live="polite"></p>
        </section>
      </aside>
    </main>
  `;
}

function setMessage(selector, text, type = "") {
  const el = $(selector);
  if (!el) return;
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
  el.textContent = text || "";
}

function friendlyDbError(error) {
  const message = error?.message || "Erro desconhecido.";
  if (message.includes("public.participants") || message.includes("schema cache")) {
    return "A tabela participants ainda nao existe no Supabase. Rode o arquivo simple-schema.sql no SQL Editor e recarregue esta pagina.";
  }
  if (message.includes("permission denied")) {
    return "Sem permissao no Supabase. Rode novamente o simple-schema.sql completo, incluindo os grants no final.";
  }
  return message;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function saveParticipant(participant) {
  localStorage.setItem(sessionKey, JSON.stringify(participant));
}

function readParticipant() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

function clearParticipant() {
  localStorage.removeItem(sessionKey);
}

function fmtDate(value) {
  if (!value) return "Data a definir";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function outcomeFor(match) {
  return match.result_pick || null;
}

function isBettingClosed(match) {
  if (!match) return true;
  if (match.status !== "scheduled") return true;
  if (!match.kickoff_at) return false;
  return new Date(match.kickoff_at).getTime() - Date.now() <= bettingCutoffMs;
}

function cutoffLabel(match) {
  if (!match.kickoff_at) return "A definir";
  return fmtDate(new Date(new Date(match.kickoff_at).getTime() - bettingCutoffMs).toISOString());
}

function pickLabel(match, pick) {
  if (pick === "HOME") return displayTeam(match.home_team || "Mandante");
  if (pick === "AWAY") return displayTeam(match.away_team || "Visitante");
  return "Empate";
}

function displayTeam(team) {
  return teamTranslations[team] || String(team || "")
    .replaceAll("1Âº", "1º")
    .replaceAll("2Âº", "2º")
    .replaceAll("3Âº", "3º");
}

function phaseFor(match) {
  return normalizePhase(match.phase || match.stage);
}

function normalizePhase(stage) {
  const value = String(stage || "").toLowerCase();
  if (value.includes("grupo")) return "Primeira fase";
  if (value.includes("32") || value.includes("16")) return "16 avos";
  if (value.includes("oitava") || value.includes("8")) return "Oitavas";
  if (value.includes("quarta") || value.includes("quarta") || value.includes("quartas") || value.includes("4")) return "Quartas";
  if (value.includes("semi")) return "Semifinal";
  if (value.includes("final")) return "Final";
  return "Primeira fase";
}

const phaseOrder = ["Primeira fase", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"];

function initSignout() {
  const button = $("#signout");
  if (!button) return;
  button.addEventListener("click", () => {
    clearParticipant();
    location.href = pageUrl("index");
  });
}

async function requireParticipant() {
  if (!configured) {
    document.body.innerHTML = `<main class="auth-shell"><section class="auth-panel"><h1>Configurar Supabase</h1><p>Edite <strong>app.js</strong> e coloque SUPABASE_URL e SUPABASE_ANON_KEY.</p></section></main>`;
    return null;
  }

  const saved = readParticipant();
  if (!saved?.id) {
    document.querySelector("main").innerHTML = `<section class="panel"><h1>Entre primeiro</h1><p>Faca login com seu e-mail para acessar esta area.</p><a class="primary inline-action" href="${pageUrl("index")}">Ir para login</a></section>`;
    return null;
  }

  const { data, error } = await client
    .from("participants")
    .select("*")
    .eq("id", saved.id)
    .single();

  if (error || !data) {
    clearParticipant();
    document.querySelector("main").innerHTML = `<section class="panel"><h1>Sessao expirada</h1><p>Entre novamente para atualizar seu acesso.</p><a class="primary inline-action" href="${pageUrl("index")}">Ir para login</a></section>`;
    return null;
  }

  saveParticipant(data);
  return data;
}

function initAuth() {
  if (!configured) {
    setMessage("#auth-message", "Edite app.js e configure sua URL e anon key do Supabase.", "error");
    return;
  }

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.toggle("active", item === button));
      $("#login-form").classList.toggle("hidden", tab !== "login");
      $("#signup-form").classList.toggle("hidden", tab !== "signup");
      setMessage("#auth-message", "");
    });
  });

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(form.get("email"));
    setMessage("#auth-message", "Entrando...");

    const { data, error } = await client
      .from("participants")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      setMessage("#auth-message", `Erro ao entrar: ${friendlyDbError(error)}`, "error");
      return;
    }

    if (!data) {
      setMessage("#auth-message", "E-mail nao cadastrado. Use a aba Cadastro primeiro.", "error");
      return;
    }

    saveParticipant(data);
    location.href = pageUrl("app");
  });

  $("#signup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = normalizeEmail(form.get("email"));

    if (!name || !email) {
      setMessage("#auth-message", "Preencha nome e e-mail.", "error");
      return;
    }

    setMessage("#auth-message", "Criando cadastro...");
    const { data, error } = await client
      .from("participants")
      .upsert({ name, email }, { onConflict: "email" })
      .select()
      .single();

    if (error) {
      setMessage("#auth-message", `Erro ao cadastrar: ${friendlyDbError(error)}`, "error");
      return;
    }

    saveParticipant(data);
    location.href = pageUrl("app");
  });
}

async function loadApp() {
  const participant = await requireParticipant();
  if (!participant) return;
  currentParticipant = participant;
  initSignout();

  $("#user-name").textContent = participant.name;
  if (participant.is_admin) $("#admin-link").classList.remove("hidden");

  const [{ data: matches, error: matchError }, { data: predictions, error: predictionError }] = await Promise.all([
    client.from("matches").select("*").order("match_no", { ascending: true }),
    client.from("predictions").select("*").eq("participant_id", participant.id),
  ]);

  if (matchError || predictionError) {
    $("#matches").innerHTML = `<p class="message error">${friendlyDbError(matchError || predictionError)}</p>`;
    return;
  }

  draftPredictions = new Map();
  currentMatches = matches || [];
  currentPredictions = predictions || [];
  renderProfile(participant, currentMatches, currentPredictions);
  renderMatches(currentMatches, currentPredictions, participant.id);
  renderStageTabs(currentMatches);
  initSavePredictions();
  await renderRanking();
  renderHistory(currentMatches, currentPredictions);
}

function renderProfile(participant, matches, predictions) {
  const root = $("#profile-card");
  if (!root) return;
  const completed = matches.filter((match) => match.status === "completed").length;
  const points = predictions.filter((prediction) => {
    const match = matches.find((item) => item.id === prediction.match_id);
    return match && outcomeFor(match) === prediction.pick;
  }).length;
  root.innerHTML = `
    <strong>${participant.name}</strong>
    <span>${participant.email}</span>
    <span>${predictions.length} palpites salvos</span>
    <span>${points} pontos em ${completed} jogos finalizados</span>
  `;
}

function renderStageTabs(matches) {
  const root = $("#phase-tabs");
  if (!root) return;
  const counts = matches.reduce((acc, match) => {
    const phase = phaseFor(match);
    acc.set(phase, (acc.get(phase) || 0) + 1);
    return acc;
  }, new Map());
  const stages = phaseOrder.filter((phase) => counts.has(phase));
  const activePhase = stages[0] || "Primeira fase";

  root.innerHTML = stages.map((stage) => `
    <button class="phase-tab ${stage === activePhase ? "active" : ""}" type="button" data-phase="${stage}">
      <span>${stage}</span>
      <small>${counts.get(stage)}</small>
    </button>
  `).join("");

  filterPhase(activePhase);

  root.querySelectorAll("[data-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll(".phase-tab").forEach((item) => item.classList.toggle("active", item === button));
      filterPhase(button.dataset.phase);
    });
  });
}

function filterPhase(phase) {
  document.querySelectorAll("[data-stage]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.stage !== phase);
  });
}

function renderMatches(matches, predictions, participantId) {
  const root = $("#matches");
  const byMatch = new Map(predictions.map((item) => [item.match_id, item.pick]));
  root.innerHTML = "";

  if (!matches.length) {
    root.innerHTML = `<p class="muted">Nenhum jogo cadastrado ainda. Importe os jogos no admin.</p>`;
    return;
  }

  const grouped = new Map();
  matches.forEach((match) => {
    const phase = phaseFor(match);
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase).push(match);
  });

  [...grouped.entries()]
    .sort(([a], [b]) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b))
    .forEach(([phase, phaseMatches]) => {
      const section = document.createElement("section");
      section.className = "phase-section";
      section.dataset.stage = phase;
      section.innerHTML = `<div class="phase-title"><h2>${phase}</h2><span>${phaseMatches.length} jogos</span></div>`;
      const list = document.createElement("div");
      list.className = "matches";

      phaseMatches.forEach((match) => {
    const selected = byMatch.get(match.id);
    const draft = draftPredictions.get(match.id);
    const locked = Boolean(selected) || isBettingClosed(match);
    const card = document.createElement("article");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-meta">
        <span>${match.stage || "Copa"}</span>
        <span>${fmtDate(match.kickoff_at)}</span>
        <span>fecha ${cutoffLabel(match)}</span>
      </div>
      <div class="teams">
        <span>${displayTeam(match.home_team || "Mandante")}</span>
        <span class="vs">x</span>
        <span>${displayTeam(match.away_team || "Visitante")}</span>
      </div>
      ${match.venue ? `<p class="venue">${match.venue}</p>` : ""}
      <div class="picks">
        ${["HOME", "DRAW", "AWAY"].map((pick) => `
          <button class="pick ${(draft || selected) === pick ? "selected" : ""}" type="button" data-pick="${pick}" ${locked ? "disabled" : ""}>
            ${pickLabel(match, pick)}
          </button>
        `).join("")}
      </div>
      ${selected ? `<p class="saved-note">Palpite salvo. Nao pode ser alterado.</p>` : ""}
      ${!selected && isBettingClosed(match) ? `<p class="saved-note">Palpites encerrados.</p>` : ""}
    `;
    card.querySelectorAll("[data-pick]").forEach((button) => {
      button.addEventListener("click", () => {
        draftPredictions.set(match.id, button.dataset.pick);
        card.querySelectorAll(".pick").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        setMessage("#prediction-message", `${draftPredictions.size} palpite(s) aguardando salvar.`);
      });
    });
        list.appendChild(card);
      });

      section.appendChild(list);
      root.appendChild(section);
  });
}

function initSavePredictions() {
  const button = $("#save-predictions");
  if (!button || button.dataset.ready) return;
  button.dataset.ready = "true";
  button.addEventListener("click", saveDraftPredictions);
}

async function saveDraftPredictions() {
  if (!currentParticipant) return;
  const existing = new Set(currentPredictions.map((item) => item.match_id));
  const matchById = new Map(currentMatches.map((match) => [match.id, match]));
  const records = [...draftPredictions.entries()]
    .filter(([matchId]) => !existing.has(matchId))
    .filter(([matchId]) => !isBettingClosed(matchById.get(matchId)))
    .map(([matchId, pick]) => ({
      participant_id: currentParticipant.id,
      match_id: matchId,
      pick,
    }));

  if (!records.length) {
    setMessage("#prediction-message", "Nenhum palpite novo para salvar.", "error");
    return;
  }

  const { error } = await client.from("predictions").insert(records);
  if (error) {
    setMessage("#prediction-message", `Nao consegui salvar: ${friendlyDbError(error)}`, "error");
    return;
  }

  setMessage("#prediction-message", `${records.length} palpite(s) salvo(s).`, "success");
  setTimeout(() => location.href = pageUrl("app"), 550);
}

async function renderRanking() {
  const root = $("#ranking");
  if (!root) return;
  const [{ data: participants }, { data: predictions }, { data: matches }] = await Promise.all([
    client.from("participants").select("id,name"),
    client.from("predictions").select("participant_id,match_id,pick"),
    client.from("matches").select("id,result_pick,status"),
  ]);

  const finished = new Map((matches || []).filter((match) => match.status === "completed").map((match) => [match.id, outcomeFor(match)]));
  const rows = (participants || []).map((participant) => {
    const score = (predictions || []).filter((prediction) => prediction.participant_id === participant.id && finished.get(prediction.match_id) === prediction.pick).length;
    return { ...participant, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  root.innerHTML = rows.slice(0, 5).map((row, index) => `
    <div class="rank-row">
      <span>${index + 1}</span>
      <strong>${row.name}</strong>
      <span class="score">${row.score} pts</span>
    </div>
  `).join("");
}

function renderHistory(matches, predictions) {
  const root = $("#history");
  if (!root) return;
  const byMatch = new Map(predictions.map((item) => [item.match_id, item.pick]));
  const rows = matches
    .filter((match) => byMatch.has(match.id) || match.status === "completed")
    .map((match) => {
      const pick = byMatch.get(match.id);
      const result = outcomeFor(match);
      const point = result && pick === result ? 1 : 0;
          return `
        <div class="history-row">
          <strong>${displayTeam(match.home_team)} x ${displayTeam(match.away_team)}</strong>
          <span>Palpite: ${pick ? pickLabel(match, pick) : "Sem palpite"}</span>
          <span>Resultado: ${result ? pickLabel(match, result) : "Pendente"}</span>
          <b>${result ? `${point} pt` : "-"}</b>
        </div>
      `;
    });

  root.innerHTML = rows.length ? rows.join("") : `<p class="muted">Seus palpites salvos aparecem aqui.</p>`;
}

async function loadAdmin() {
  const participant = await requireParticipant();
  if (!participant) return;
  initSignout();

  let isAdmin = Boolean(participant.is_admin);
  if (!isAdmin) {
    const code = window.prompt("Codigo de admin");
    isAdmin = code === ADMIN_CODE;
  }

  if (!isAdmin) {
    document.querySelector("main").innerHTML = `<section class="panel"><h1>Acesso restrito</h1><p>Seu usuario ainda nao esta marcado como admin.</p></section>`;
    return;
  }

  await renderAdminMatches();
  await renderParticipants();
  $("#import-csv").addEventListener("click", importCsv);
}

async function renderParticipants() {
  const root = $("#participants-list");
  if (!root) return;
  const [{ data: participants, error: participantsError }, { data: predictions }, { data: matches }] = await Promise.all([
    client.from("participants").select("*").order("created_at", { ascending: true }),
    client.from("predictions").select("participant_id,match_id,pick"),
    client.from("matches").select("id,result_pick,status"),
  ]);

  if (participantsError) {
    root.innerHTML = `<p class="message error">${friendlyDbError(participantsError)}</p>`;
    return;
  }

  const finished = new Map((matches || []).filter((match) => match.status === "completed").map((match) => [match.id, outcomeFor(match)]));
  root.innerHTML = (participants || []).map((participant) => {
    const userPredictions = (predictions || []).filter((prediction) => prediction.participant_id === participant.id);
    const points = userPredictions.filter((prediction) => finished.get(prediction.match_id) === prediction.pick).length;
    return `
      <div class="participant-row">
        <strong>${participant.name}</strong>
        <span>${participant.email}</span>
        <b>${points} pts</b>
        <small>${userPredictions.length} palpites</small>
      </div>
    `;
  }).join("");
}

async function renderAdminMatches() {
  const { data: matches, error } = await client.from("matches").select("*").order("match_no", { ascending: true });
  const root = $("#admin-matches");
  if (error) {
    root.innerHTML = `<p class="message error">${friendlyDbError(error)}</p>`;
    return;
  }

  root.innerHTML = (matches || []).map((match) => `
    <form class="admin-row" data-match-id="${match.id}">
      <div>
        <strong>Jogo ${match.match_no || ""}</strong>
        <p class="muted">${phaseFor(match)} - ${match.stage || ""} - ${fmtDate(match.kickoff_at)}</p>
      </div>
      <label>Time A<input name="home_team" type="text" value="${match.home_team || ""}"></label>
      <label>Time B<input name="away_team" type="text" value="${match.away_team || ""}"></label>
      <label>Resultado
        <select name="result_pick">
          <option value="">Pendente</option>
          <option value="HOME" ${match.result_pick === "HOME" ? "selected" : ""}>${displayTeam(match.home_team)}</option>
          <option value="DRAW" ${match.result_pick === "DRAW" ? "selected" : ""}>Empate</option>
          <option value="AWAY" ${match.result_pick === "AWAY" ? "selected" : ""}>${displayTeam(match.away_team)}</option>
        </select>
      </label>
      <button class="primary" type="submit">Salvar</button>
    </form>
  `).join("");

  root.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const resultPick = data.get("result_pick") || null;
      const { error } = await client.from("matches").update({
        home_team: String(data.get("home_team") || "").trim(),
        away_team: String(data.get("away_team") || "").trim(),
        result_pick: resultPick,
        status: resultPick ? "completed" : "scheduled",
      }).eq("id", form.dataset.matchId);

      setMessage("#admin-message", error ? friendlyDbError(error) : "Resultado salvo.", error ? "error" : "success");
      if (!error) await renderRanking();
    });
  });
}

function parseCsvLine(line) {
  const parts = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  parts.push(current.trim());
  return parts;
}

async function importCsv() {
  const text = $("#csv-input").value.trim();
  if (!text) return;
  const rows = text.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  const records = rows.map((row) => {
    const hasPhase = row.length >= 7;
    const [match_no, phase, stage, kickoff_at, home_team, away_team, venue] = hasPhase
      ? row
      : [row[0], normalizePhase(row[1]), row[1], row[2], row[3], row[4], row[5]];
    return {
    match_no: Number(match_no),
    phase,
    stage,
    kickoff_at,
    home_team: displayTeam(home_team),
    away_team: displayTeam(away_team),
    venue,
    };
  });
  const { error } = await client.from("matches").upsert(records, { onConflict: "match_no" });
  if (error) {
    setMessage("#admin-message", friendlyDbError(error), "error");
    return;
  }
  setMessage("#admin-message", `${records.length} jogos importados.`, "success");
  await renderAdminMatches();
}

if (page === "app" && document.body.dataset.page !== "app") mountAppShell();
if (page === "admin" && document.body.dataset.page !== "admin") mountAdminShell();

if (page === "auth") initAuth();
if (page === "app") loadApp();
if (page === "admin") loadAdmin();
