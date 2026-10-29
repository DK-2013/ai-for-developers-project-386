import { readFile } from "node:fs/promises";

// Fixed list of files that may hold suppressions hiding a security finding.
// Add a file here when a scanner gets a new suppression mechanism.
const suppressionFiles = [".betterleaks.toml", "osv-scanner.toml"];
const reviewPattern = /review\s+(\d{4}-\d{2}-\d{2})\b(.*)$/gm;

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const errors = [];
let found = 0;

for (const file of suppressionFiles) {
  let contents;

  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      continue;
    }

    throw error;
  }

  for (const match of contents.matchAll(reviewPattern)) {
    found += 1;
    const [, date, rest] = match;
    const parsed = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      errors.push(`${file}: invalid review date ${date}`);
      continue;
    }

    if (parsed < today) {
      errors.push(`${file}: review date ${date} has passed`);
    }

    const reason = rest.trim().replace(/^[:\-–—]\s*/, "");
    if (reason.split(/\s+/).length < 2) {
      errors.push(`${file}: review ${date} needs a written reason`);
    }
  }
}

if (found === 0) {
  errors.push("no suppression review dates found");
}

if (errors.length > 0) {
  for (const error of errors) {
    process.stderr.write(`${error}\n`);
  }
  process.exit(1);
}

process.stdout.write(`Checked ${found} suppression review date(s).\n`);
