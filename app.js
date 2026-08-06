import { catalog } from "./content/catalog.js";
import { buildCards, dueCards, loadSchedule, rateCard } from "./learning/srs.js";

const state = {
  packs: new Map(),
  selected: new Set(JSON.parse(localStorage.getItem("stotra-sadhana:selected") || "[]")),
  view: "library",
  reviewQueue: [],
  reviewIndex: 0,
  answerVisible: false,
  learnSelection: null
};

async function loadPacks() {
  for (const item of catalog) {
    const module = await import(`./${item.source}`);
    state.packs.set(item.id, module.default);
  }
  if (!state.selected.size && catalog[0]) state.selected.add(catalog[0].id);
}

const el = id => document.getElementById(id);
const selectedPacks = () => [...state.selected].map(id => state.packs.get(id)).filter(Boolean);
const allCards = () => selectedPacks().flatMap(buildCards);

function saveSelected() {
  localStorage.setItem("stotra-sadhana:selected", JSON.stringify([...state.selected]));
}

function renderSelector() {
  el("text-selector").innerHTML = catalog.map(item => `
    <label class="selector-item">
      <input type="checkbox" value="${item.id}" ${state.selected.has(item.id) ? "checked" : ""}>
      <span><strong>${item.title}</strong><small>${item.transliteration} · ${item.totalItems} ${item.itemLabelPlural}</small></span>
    </label>
  `).join("");
  el("text-selector").querySelectorAll("input").forEach(input => input.addEventListener("change", () => {
    input.checked ? state.selected.add(input.value) : state.selected.delete(input.value);
    saveSelected();
    renderAll();
  }));
}

function renderLibrary() {
  const view = el("view-library");
  const packs = selectedPacks();
  if (!packs.length) return view.replaceChildren(el("empty-template").content.cloneNode(true));
  view.innerHTML = `<div class="grid">${packs.map(pack => {
    const meta = catalog.find(item => item.id === pack.id);
    const loadedItems = pack.pravahas.flatMap(p => p.samuhas.flatMap(s => s.items)).length;
    return `<article class="card">
      <p class="eyebrow">${meta.contentType}</p>
      <h2>${pack.title}</h2>
      <p class="muted">${meta.description}</p>
      <div class="grid">
        <div><div class="stat">${pack.pravahas.length}</div><small>Loaded Pravāhas</small></div>
        <div><div class="stat">${loadedItems}</div><small>Loaded Nāmas</small></div>
      </div>
      <div class="actions"><button class="button primary" data-open-read="${pack.id}">Read</button><button class="button" data-open-learn="${pack.id}">Learn</button></div>
    </article>`;
  }).join("")}</div>`;
  view.querySelectorAll("[data-open-read]").forEach(button => button.onclick = () => switchView("read"));
  view.querySelectorAll("[data-open-learn]").forEach(button => button.onclick = () => switchView("learn"));
}

function renderRead() {
  const view = el("view-read");
  const packs = selectedPacks();
  if (!packs.length) return view.replaceChildren(el("empty-template").content.cloneNode(true));
  const pack = packs[0];
  const pravaha = pack.pravahas[0];
  view.innerHTML = `<div class="reader-toolbar">
    <select id="read-text">${packs.map(p => `<option value="${p.id}">${p.shortTitle}</option>`).join("")}</select>
    <select id="read-pravaha">${pack.pravahas.map(p => `<option value="${p.number}">#${p.number} — ${p.title}</option>`).join("")}</select>
  </div><div id="reader-content"></div>`;
  const renderContent = () => {
    const selectedPack = state.packs.get(el("read-text").value);
    const selectedPravaha = selectedPack.pravahas.find(p => p.number === Number(el("read-pravaha").value)) || selectedPack.pravahas[0];
    el("reader-content").innerHTML = `<article class="reader-card"><p class="eyebrow">Pravāha ${selectedPravaha.number}</p><h2>${selectedPravaha.title}</h2>${selectedPravaha.samuhas.map(s => `<section class="samuha"><h3>समूहः ${s.number} — ${s.title}</h3><div class="nama-list">${s.items.map(i => `<div>${i.number}. ${i.text}</div>`).join("")}</div></section>`).join("")}</article>`;
  };
  el("read-text").onchange = () => {
    const selectedPack = state.packs.get(el("read-text").value);
    el("read-pravaha").innerHTML = selectedPack.pravahas.map(p => `<option value="${p.number}">#${p.number} — ${p.title}</option>`).join("");
    renderContent();
  };
  el("read-pravaha").onchange = renderContent;
  renderContent();
}

function learnUnits() {
  return selectedPacks().flatMap(pack => pack.pravahas.flatMap(pravaha => pravaha.samuhas.map(samuha => ({ pack, pravaha, samuha }))));
}

function renderLearn() {
  const view = el("view-learn");
  const units = learnUnits();
  if (!units.length) return view.replaceChildren(el("empty-template").content.cloneNode(true));
  if (!state.learnSelection) state.learnSelection = units[0];
  view.innerHTML = `<div class="learn-layout"><div class="learn-list">${units.map((unit, index) => `<button class="learn-item ${unit.samuha.number === state.learnSelection.samuha.number && unit.pack.id === state.learnSelection.pack.id ? "active" : ""}" data-unit="${index}"><strong>${unit.pack.shortTitle}</strong><br><small>#${unit.pravaha.number} · समूहः ${unit.samuha.number} — ${unit.samuha.title}</small></button>`).join("")}</div><article class="card" id="learn-detail"></article></div>`;
  const showUnit = unit => {
    state.learnSelection = unit;
    el("learn-detail").innerHTML = `<p class="eyebrow">${unit.pack.shortTitle} · Pravāha ${unit.pravaha.number}</p><h2>समूहः ${unit.samuha.number} — ${unit.samuha.title}</h2><p class="muted">Read once, then hide the nāmas and recite from memory.</p><div>${unit.samuha.items.map(item => `<div class="reveal-line">${item.number}. ${item.text}</div>`).join("")}</div><div class="actions"><button id="toggle-lines" class="button primary">Hide nāmas</button></div>`;
    let hidden = false;
    el("toggle-lines").onclick = () => {
      hidden = !hidden;
      el("learn-detail").querySelectorAll(".reveal-line").forEach(line => line.classList.toggle("hidden-line", hidden));
      el("toggle-lines").textContent = hidden ? "Reveal nāmas" : "Hide nāmas";
    };
  };
  view.querySelectorAll("[data-unit]").forEach(button => button.onclick = () => {
    showUnit(units[Number(button.dataset.unit)]);
    renderLearn();
  });
  showUnit(state.learnSelection);
}

function prepareReview() {
  state.reviewQueue = dueCards(allCards(), loadSchedule()).sort(() => Math.random() - .5).slice(0, 20);
  state.reviewIndex = 0;
  state.answerVisible = false;
}

function renderReview() {
  const view = el("view-review");
  if (!selectedPacks().length) return view.replaceChildren(el("empty-template").content.cloneNode(true));
  if (!state.reviewQueue.length || state.reviewIndex >= state.reviewQueue.length) prepareReview();
  const card = state.reviewQueue[state.reviewIndex];
  if (!card) {
    view.innerHTML = `<div class="empty-state"><h2>Review complete</h2><p>No cards are currently due.</p><button class="button" id="new-review">Start a mixed practice session</button></div>`;
    el("new-review").onclick = () => { state.reviewQueue = allCards().sort(() => Math.random() - .5).slice(0, 20); state.reviewIndex = 0; renderReview(); };
    return;
  }
  view.innerHTML = `<article class="review-card"><p class="eyebrow">${state.packs.get(card.textId).shortTitle} · समूहः ${card.samuha.number}</p><div class="review-prompt">${card.prompt}</div><button id="show-answer" class="button primary">Show answer</button><div id="review-answer" class="review-answer" ${state.answerVisible ? "" : "hidden"}><div class="nama-list">${card.answer.split("\n").map(line => `<div>${line}</div>`).join("")}</div><div class="rating-row">${["again","hard","good","easy"].map(r => `<button class="rating-button" data-rating="${r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join("")}</div></div><p class="muted">${state.reviewIndex + 1} / ${state.reviewQueue.length}</p></article>`;
  el("show-answer").onclick = () => { state.answerVisible = true; renderReview(); };
  view.querySelectorAll("[data-rating]").forEach(button => button.onclick = () => {
    rateCard(card, button.dataset.rating);
    state.reviewIndex += 1;
    state.answerVisible = false;
    renderAll();
  });
}

function renderProgress() {
  const view = el("view-progress");
  const schedule = loadSchedule();
  const cards = allCards();
  const reviewed = cards.filter(card => schedule[card.id]);
  const mastered = reviewed.filter(card => schedule[card.id].intervalDays >= 21);
  const percentage = cards.length ? Math.round(reviewed.length / cards.length * 100) : 0;
  view.innerHTML = `<div class="grid"><article class="card"><p class="eyebrow">Coverage</p><div class="stat">${percentage}%</div><p class="muted">${reviewed.length} of ${cards.length} generated cards reviewed</p><div class="progress-bar"><span style="width:${percentage}%"></span></div></article><article class="card"><p class="eyebrow">Mastered</p><div class="stat">${mastered.length}</div><p class="muted">Cards with an interval of at least 21 days</p></article><article class="card"><p class="eyebrow">Mode</p><div class="stat">${state.selected.size > 1 ? "Mixed" : "Focused"}</div><p class="muted">${selectedPacks().map(p => p.shortTitle).join(" + ")}</p></article></div>`;
}

function updateDueCount() {
  el("due-count").textContent = dueCards(allCards(), loadSchedule()).length;
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === view));
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === `view-${view}`));
  renderAll();
}

function renderAll() {
  renderSelector();
  renderLibrary();
  renderRead();
  renderLearn();
  renderReview();
  renderProgress();
  updateDueCount();
}

document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => switchView(tab.dataset.view));
el("theme-toggle").onclick = () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark";
  localStorage.setItem("stotra-sadhana:theme", root.dataset.theme || "light");
};
if (localStorage.getItem("stotra-sadhana:theme") === "dark") document.documentElement.dataset.theme = "dark";

await loadPacks();
renderAll();
