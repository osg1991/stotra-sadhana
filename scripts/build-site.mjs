import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const output = "dist";
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "sw.js"
];
const directories = ["content", "learning", "docs"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of files) {
  if (!existsSync(file)) {
    throw new Error(`Required site asset is missing: ${file}`);
  }
  await cp(file, `${output}/${file}`);
}

for (const directory of directories) {
  if (existsSync(directory)) {
    await cp(directory, `${output}/${directory}`, { recursive: true });
  }
}

// Prevent Jekyll processing of files and folders beginning with underscores.
await writeFile(`${output}/.nojekyll`, "");
console.log(`Static site prepared in ${output}/`);
