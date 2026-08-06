import { catalog } from "../content/catalog.js";

let errors = 0;
for (const item of catalog) {
  const module = await import(`../${item.source}`);
  const pack = module.default;
  const seenPravahas = new Set();
  const seenSamuhas = new Set();
  const seenItems = new Set();

  if (pack.id !== item.id) {
    console.error(`${item.id}: catalog id and pack id differ`);
    errors += 1;
  }

  for (const pravaha of pack.pravahas) {
    if (seenPravahas.has(pravaha.number)) {
      console.error(`${item.id}: duplicate pravaha ${pravaha.number}`);
      errors += 1;
    }
    seenPravahas.add(pravaha.number);

    for (const samuha of pravaha.samuhas) {
      if (seenSamuhas.has(samuha.number)) {
        console.error(`${item.id}: duplicate samuha ${samuha.number}`);
        errors += 1;
      }
      seenSamuhas.add(samuha.number);
      if (!samuha.items.length) {
        console.error(`${item.id}: empty samuha ${samuha.number}`);
        errors += 1;
      }

      let previous = -Infinity;
      for (const itemEntry of samuha.items) {
        if (seenItems.has(itemEntry.number)) {
          console.error(`${item.id}: duplicate item ${itemEntry.number}`);
          errors += 1;
        }
        if (itemEntry.number <= previous) {
          console.error(`${item.id}: non-increasing order in samuha ${samuha.number}`);
          errors += 1;
        }
        if (!itemEntry.text?.trim()) {
          console.error(`${item.id}: empty item text at ${itemEntry.number}`);
          errors += 1;
        }
        seenItems.add(itemEntry.number);
        previous = itemEntry.number;
      }
    }
  }

  console.log(`${item.id}: ${seenPravahas.size} pravahas, ${seenSamuhas.size} samuhas, ${seenItems.size} loaded items`);
}

if (errors) process.exit(1);
console.log("Content validation passed.");
