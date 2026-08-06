const STORAGE_KEY = "stotra-sadhana:srs:v1";

export function loadSchedule() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

export function saveSchedule(schedule) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

export function cardId(textId, samuhaNumber, mode) {
  return `${textId}:samuha:${samuhaNumber}:${mode}`;
}

export function dueCards(cards, schedule = loadSchedule(), now = Date.now()) {
  return cards.filter(card => {
    const state = schedule[card.id];
    return !state || !state.due || state.due <= now;
  });
}

export function rateCard(card, rating, schedule = loadSchedule(), now = Date.now()) {
  const previous = schedule[card.id] || { intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0 };
  const factors = {
    again: { interval: 0.02, ease: -0.2, repetition: 0, lapse: 1 },
    hard: { interval: Math.max(1, previous.intervalDays * 1.2 || 1), ease: -0.05, repetition: 1, lapse: 0 },
    good: { interval: previous.intervalDays ? previous.intervalDays * previous.ease : 2, ease: 0, repetition: 1, lapse: 0 },
    easy: { interval: previous.intervalDays ? previous.intervalDays * (previous.ease + 0.35) : 4, ease: 0.1, repetition: 1, lapse: 0 }
  };
  const rule = factors[rating] || factors.good;
  const intervalDays = Math.max(0.02, Math.round(rule.interval * 100) / 100);
  const next = {
    intervalDays,
    ease: Math.min(3.2, Math.max(1.3, previous.ease + rule.ease)),
    repetitions: rating === "again" ? 0 : previous.repetitions + rule.repetition,
    lapses: previous.lapses + rule.lapse,
    lastReviewed: now,
    due: now + intervalDays * 86400000
  };
  schedule[card.id] = next;
  saveSchedule(schedule);
  return next;
}

export function buildCards(text) {
  const cards = [];
  for (const pravaha of text.pravahas) {
    for (const samuha of pravaha.samuhas) {
      if (!samuha.items.length) continue;
      const first = samuha.items[0];
      const last = samuha.items[samuha.items.length - 1];
      cards.push({
        id: cardId(text.id, samuha.number, "sequence"),
        textId: text.id,
        pravaha,
        samuha,
        mode: "sequence",
        prompt: `Recite समूहः ${samuha.number} — ${samuha.title}`,
        answer: samuha.items.map(item => `${item.number}. ${item.text}`).join("\n")
      });
      cards.push({
        id: cardId(text.id, samuha.number, "first"),
        textId: text.id,
        pravaha,
        samuha,
        mode: "first",
        prompt: `What is the first nāma of समूहः ${samuha.number} — ${samuha.title}?`,
        answer: `${first.number}. ${first.text}`
      });
      cards.push({
        id: cardId(text.id, samuha.number, "last"),
        textId: text.id,
        pravaha,
        samuha,
        mode: "last",
        prompt: `What is the final nāma of समूहः ${samuha.number} — ${samuha.title}?`,
        answer: `${last.number}. ${last.text}`
      });
    }
  }
  return cards;
}
