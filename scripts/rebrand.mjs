#!/usr/bin/env node
// Mission LLM rebrand: rewrites AnythingLLM naming across every tracked file and
// renames tracked files whose paths carry the old name. Deterministic and
// idempotent, so it can be re-run after merging upstream AnythingLLM changes.
//
// Usage: node scripts/rebrand.mjs [--dry-run] [--report <path>]
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry-run");
const reportIdx = process.argv.indexOf("--report");
const REPORT = reportIdx > -1 ? process.argv[reportIdx + 1] : null;

const root = execSync("git rev-parse --show-toplevel").toString().trim();
process.chdir(root);

// Never touched: lockfiles are checksummed, the MIT notice must stay intact,
// submodule pointers reference upstream repos, and Prisma checksums migrations.
const EXCLUDE = [
  /(^|\/)yarn\.lock$/,
  /(^|\/)package-lock\.json$/,
  /^LICENSE$/,
  /^NOTICE$/,
  /^TERMS_SELF_HOSTED\.md$/,
  /^\.gitmodules$/,
  /^server\/prisma\/migrations\//,
  /^scripts\/rebrand\.mjs$/,
];
const BINARY_EXT =
  /\.(png|jpe?g|gif|ico|webp|bmp|woff2?|ttf|otf|eot|mp3|mp4|wav|ogg|webm|pdf|zip|gz|tgz|onnx|bin|wasm|db|sqlite)$/i;
// In prose files a standalone brand word becomes the display name "Mission LLM".
const PROSE = /(\.(md|mdx|txt|html|ya?ml|gotmpl)$)|(^|\/)locales\//i;

// Spans never rewritten: URLs, hosts, and repo slugs for services and repositories
// we do not own. Renaming them would break links, update checks, and APIs.
const PROTECT = [
  /https?:\/\/[^\s"'`<>()\[\]{}]*(?:anything[ _-]?llm|mintplex)[^\s"'`<>()\[\]{}]*/gi,
  /[A-Za-z0-9.-]*anythingllm\.(?:com|ai|io)[^\s"'`<>()\[\]{}]*/gi,
  /[A-Za-z0-9.-]*mintplexlabs\.com[^\s"'`<>()\[\]{}]*/gi,
  /mintplex[-_]?labs\/[A-Za-z0-9._-]+/gi,
  // Explicit opt-outs for names that must survive a re-run: upgrade shims read
  // pre-rebrand keys, and attribution names the upstream project. Mark a single
  // line with "rebrand:keep", or a region with "rebrand:keep-start" and
  // "rebrand:keep-end".
  /rebrand:keep-start[\s\S]*?rebrand:keep-end/g,
  /^.*rebrand:keep(?!-(?:start|end)).*$/gm,
];

const ID_CHAR = "[A-Za-z0-9_$]";
const RULES = (prose) => [
  [/Anything LLM/g, "Mission LLM"],
  [/anything-llm/g, "mission-llm"],
  [/anything_llm/g, "mission_llm"],
  [/anythingllm/g, "missionllm"],
  [/ANYTHING_LLM/g, "MISSION_LLM"],
  [/ANYTHINGLLM/g, "MISSIONLLM"],
  // Glued to identifier characters it is part of a name, so it must stay one word.
  [new RegExp(`(?<=${ID_CHAR})AnythingLLM|AnythingLLM(?=${ID_CHAR})`, "g"), "MissionLLM"],
  [/AnythingLLM/g, prose ? "Mission LLM" : "MissionLLM"],
];

function protectedSpans(text) {
  const spans = [];
  for (const re of PROTECT)
    for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length, m[0]]);
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  return { merged, raw: spans.map((s) => s[2]) };
}

function rebrandText(text, prose) {
  const { merged, raw } = protectedSpans(text);
  const rules = RULES(prose);
  let count = 0;
  const apply = (seg) => {
    for (const [re, rep] of rules)
      seg = seg.replace(re, () => {
        count++;
        return rep;
      });
    return seg;
  };
  let out = "";
  let pos = 0;
  for (const [a, b] of merged) {
    out += apply(text.slice(pos, a)) + text.slice(a, b);
    pos = b;
  }
  out += apply(text.slice(pos));
  return { out, count, protectedHits: raw };
}

function rebrandPath(p) {
  let q = p;
  for (const [re, rep] of RULES(false)) q = q.replace(re, rep);
  return q;
}

const files = execSync("git ls-files -z")
  .toString()
  .split("\0")
  .filter(Boolean);

const perFile = [];
const protectedTally = new Map();
let total = 0;

for (const f of files) {
  if (EXCLUDE.some((re) => re.test(f)) || BINARY_EXT.test(f)) continue;
  let st;
  try {
    st = fs.lstatSync(f);
  } catch {
    continue;
  }
  if (!st.isFile()) continue; // skips submodule gitlinks and symlinks
  const buf = fs.readFileSync(f);
  if (buf.subarray(0, 8000).includes(0)) continue; // binary
  const text = buf.toString("utf8");
  const { out, count, protectedHits } = rebrandText(text, PROSE.test(f));
  for (const h of protectedHits) protectedTally.set(h, (protectedTally.get(h) || 0) + 1);
  if (count > 0) {
    perFile.push([f, count]);
    total += count;
    if (!DRY) fs.writeFileSync(f, out);
  }
}

const renames = files
  .filter((f) => /anything[ _-]?llm/i.test(f) && !EXCLUDE.some((re) => re.test(f)))
  .map((f) => [f, rebrandPath(f)])
  .filter(([a, b]) => a !== b);

if (!DRY) {
  for (const [from, to] of renames) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    execFileSync("git", ["mv", "--", from, to]);
  }
}

perFile.sort((a, b) => b[1] - a[1]);
console.log(`${DRY ? "[dry-run] " : ""}replacements: ${total} across ${perFile.length} files`);
console.log(`${DRY ? "[dry-run] " : ""}file renames: ${renames.length}`);
console.log(`protected spans (kept verbatim): ${[...protectedTally.values()].reduce((a, b) => a + b, 0)} (${protectedTally.size} unique)`);
console.log("top files:");
for (const [f, c] of perFile.slice(0, 15)) console.log(`  ${String(c).padStart(4)}  ${f}`);

if (REPORT) {
  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        dryRun: DRY,
        total,
        files: perFile,
        renames,
        protected: [...protectedTally.entries()].sort((a, b) => b[1] - a[1]),
      },
      null,
      2
    )
  );
  console.log(`report: ${REPORT}`);
}
