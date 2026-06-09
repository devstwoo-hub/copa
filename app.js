const SUPABASE_URL = "https://zlqsmhlutktkeggqnaox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscXNtaGx1dGt0a2VnZ3FuYW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDEyNTQsImV4cCI6MjA5NjU3NzI1NH0.T2Wnrp3tZvZaUDaETYLslidWb2i3leaa-Ioj8SJXg-c";
const ADMIN_CODE = "admin2026";

const page = document.body.dataset.page;
const configured = SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 30;
const client = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const sessionKey = "bolao_participant";

const $ = (selector) => document.querySelector(selector);

function setMessage(selector, text, type = "") {
  const el = $(selector);
  if (!el) return;
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
  el.textContent = text || "";
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
  if (match.home_score === null || match.away_score === null) return null;
  if (match.home_score > match.away_score) return "HOME";
  if (match.home_score < match.away_score) return "AWAY";
  return "DRAW";
}

function pickLabel(match, pick) {
  if (pick === "HOME") return match.home_team || "Mandante";
  if (pick === "AWAY") return match.away_team || "Visitante";
  return "Empate";
}

function initSignout() {
  const button = $("#signout");
  if (!button) return;
  button.addEventListener("click", () => {
    clearParticipant();
    location.href = "./index.html";
  });
}

async function requireParticipant() {
  if (!configured) {
    document.body.innerHTML = `<main class="auth-shell"><section class="auth-panel"><h1>Configurar Supabase</h1><p>Edite <strong>app.js</strong> e coloque SUPABASE_URL e SUPABASE_ANON_KEY.</p></section></main>`;
    return null;
  }

  const saved = readParticipant();
  if (!saved?.id) {
    location.href = "./index.html";
    return null;
  }

  const { data, error } = await client
    .from("participants")
    .select("*")
    .eq("id", saved.id)
    .single();

  if (error || !data) {
    clearParticipant();
    location.href = "./index.html";
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

  if (readParticipant()?.id) {
    location.href = "./app.html";
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
      setMessage("#auth-message", `Erro ao entrar: ${error.message}`, "error");
      return;
    }

    if (!data) {
      setMessage("#auth-message", "E-mail nao cadastrado. Use a aba Cadastro primeiro.", "error");
      return;
    }

    saveParticipant(data);
    location.href = "./app.html";
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
      setMessage("#auth-message", `Erro ao cadastrar: ${error.message}`, "error");
      return;
    }

    saveParticipant(data);
    location.href = "./app.html";
  });
}

async function loadApp() {
  const participant = await requireParticipant();
  if (!participant) return;
  initSignout();

  $("#user-name").textContent = participant.name;
  if (participant.is_admin) $("#admin-link").classList.remove("hidden");

  const [{ data: matches, error: matchError }, { data: predictions, error: predictionError }] = await Promise.all([
    client.from("matches").select("*").order("kickoff_at", { ascending: true }).order("match_no", { ascending: true }),
    client.from("predictions").select("*").eq("participant_id", participant.id),
  ]);

  if (matchError || predictionError) {
    $("#matches").innerHTML = `<p class="message error">${matchError?.message || predictionError?.message}</p>`;
    return;
  }

  renderStageFilter(matches || []);
  renderMatches(matches || [], predictions || [], participant.id);
  await renderRanking();
}

function renderStageFilter(matches) {
  const filter = $("#stage-filter");
  const stages = [...new Set(matches.map((match) => match.stage).filter(Boolean))];
  stages.forEach((stage) => {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = stage;
    filter.appendChild(option);
  });
  filter.addEventListener("change", () => {
    document.querySelectorAll("[data-stage]").forEach((card) => {
      card.classList.toggle("hidden", filter.value !== "all" && card.dataset.stage !== filter.value);
    });
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

  matches.forEach((match) => {
    const selected = byMatch.get(match.id);
    const locked = match.status !== "scheduled" || (match.kickoff_at && new Date(match.kickoff_at) <= new Date());
    const card = document.createElement("article");
    card.className = "match-card";
    card.dataset.stage = match.stage || "";
    card.innerHTML = `
      <div class="match-meta">
        <span>${match.stage || "Copa"}</span>
        <span>${fmtDate(match.kickoff_at)}</span>
        <span>${match.venue || ""}</span>
      </div>
      <div class="teams">
        <span>${match.home_team || "Mandante"}</span>
        <span class="vs">x</span>
        <span>${match.away_team || "Visitante"}</span>
      </div>
      <div class="picks">
        ${["HOME", "DRAW", "AWAY"].map((pick) => `
          <button class="pick ${selected === pick ? "selected" : ""}" type="button" data-pick="${pick}" ${locked ? "disabled" : ""}>
            ${pickLabel(match, pick)}
          </button>
        `).join("")}
      </div>
    `;
    card.querySelectorAll("[data-pick]").forEach((button) => {
      button.addEventListener("click", async () => {
        const { error } = await client.from("predictions").upsert({
          participant_id: participantId,
          match_id: match.id,
          pick: button.dataset.pick,
        }, { onConflict: "participant_id,match_id" });

        if (error) {
          alert(`Nao consegui salvar o palpite: ${error.message}`);
          return;
        }

        card.querySelectorAll(".pick").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        await renderRanking();
      });
    });
    root.appendChild(card);
  });
}

async function renderRanking() {
  const [{ data: participants }, { data: predictions }, { data: matches }] = await Promise.all([
    client.from("participants").select("id,name"),
    client.from("predictions").select("participant_id,match_id,pick"),
    client.from("matches").select("id,home_score,away_score,status"),
  ]);

  const finished = new Map((matches || []).filter((match) => match.status === "completed").map((match) => [match.id, outcomeFor(match)]));
  const rows = (participants || []).map((participant) => {
    const score = (predictions || []).filter((prediction) => prediction.participant_id === participant.id && finished.get(prediction.match_id) === prediction.pick).length;
    return { ...participant, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  $("#ranking").innerHTML = rows.map((row, index) => `
    <div class="rank-row">
      <span>${index + 1}</span>
      <strong>${row.name}</strong>
      <span class="score">${row.score} pts</span>
    </div>
  `).join("");
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
  $("#import-csv").addEventListener("click", importCsv);
}

async function renderAdminMatches() {
  const { data: matches, error } = await client.from("matches").select("*").order("kickoff_at", { ascending: true }).order("match_no", { ascending: true });
  const root = $("#admin-matches");
  if (error) {
    root.innerHTML = `<p class="message error">${error.message}</p>`;
    return;
  }

  root.innerHTML = (matches || []).map((match) => `
    <form class="admin-row" data-match-id="${match.id}">
      <div>
        <strong>${match.home_team} x ${match.away_team}</strong>
        <p class="muted">${match.stage || ""} - ${fmtDate(match.kickoff_at)}</p>
      </div>
      <label>Casa<input name="home_score" type="number" min="0" value="${match.home_score ?? ""}"></label>
      <label>Fora<input name="away_score" type="number" min="0" value="${match.away_score ?? ""}"></label>
      <button class="primary" type="submit">Salvar</button>
    </form>
  `).join("");

  root.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const homeScore = data.get("home_score") === "" ? null : Number(data.get("home_score"));
      const awayScore = data.get("away_score") === "" ? null : Number(data.get("away_score"));
      const { error } = await client.from("matches").update({
        home_score: homeScore,
        away_score: awayScore,
        status: homeScore === null || awayScore === null ? "scheduled" : "completed",
      }).eq("id", form.dataset.matchId);

      setMessage("#admin-message", error ? error.message : "Resultado salvo.", error ? "error" : "success");
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
  const records = rows.map(([match_no, stage, kickoff_at, home_team, away_team, venue]) => ({
    match_no: Number(match_no),
    stage,
    kickoff_at,
    home_team,
    away_team,
    venue,
    status: "scheduled",
  }));
  const { error } = await client.from("matches").upsert(records, { onConflict: "match_no" });
  if (error) {
    setMessage("#admin-message", error.message, "error");
    return;
  }
  setMessage("#admin-message", `${records.length} jogos importados.`, "success");
  await renderAdminMatches();
}

if (page === "auth") initAuth();
if (page === "app") loadApp();
if (page === "admin") loadAdmin();
