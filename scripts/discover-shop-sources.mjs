import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const DATA_DIR = "data";
const SOURCE_FILE = "shop-sources.json";
const DISCOVERY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DISCOVERED_SOURCES = 24;
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DISCOVERY_QUERIES = {
  green: ["생두 쇼핑몰", "커피 생두 1kg 판매", "스페셜티 생두 판매"],
  whole: ["커피 원두 쇼핑몰", "홀빈 원두 판매", "스페셜티 원두 판매"],
};
const BLOCKED_HOSTS = /(^|\.)(blog\.naver\.com|cafe\.naver\.com|m\.search\.naver\.com|search\.naver\.com|shopping\.naver\.com|coupang\.com|hellomarket\.com|enuricoffee\.com|youtube\.com|instagram\.com|facebook\.com|daum\.net|tistory\.com)$/;

function sourceId(url) {
  return canonicalSourceUrl(url).replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function canonicalSourceUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^(m|www)\./, "").toLowerCase();
    if (host === "smartstore.naver.com") {
      const store = parsed.pathname.split("/").filter(Boolean)[0];
      return store ? `https://smartstore.naver.com/${store}` : "";
    }
    return `https://${host}/`;
  } catch {
    return "";
  }
}

function sellerFromSourceUrl(url) {
  const parsed = new URL(url);
  if (parsed.hostname === "smartstore.naver.com") return parsed.pathname.split("/").filter(Boolean)[0]?.replace(/[_-]/g, " ") || "스마트스토어";
  return parsed.hostname.replace(/^(www\.|m\.)/, "").replace(/\.[a-z.]+$/, "");
}

function isAllowedSourceUrl(url) {
  try {
    const host = new URL(url).hostname;
    return !BLOCKED_HOSTS.test(host) && host !== "naver.com" && !(host.endsWith(".naver.com") && host !== "smartstore.naver.com");
  } catch {
    return false;
  }
}

export function sourceCandidate(link, text, kind, now = new Date().toISOString()) {
  const url = canonicalSourceUrl(link);
  if (!url || !/(커피|생두|원두|홀빈|coffee|bean|roast)/i.test(`${text} ${link}`)) return null;
  if (!isAllowedSourceUrl(url)) return null;

  return {
    id: sourceId(url),
    url,
    seller: sellerFromSourceUrl(url),
    kinds: [kind],
    direct: false,
    origin: "discovered",
    discoveredAt: now,
    lastSeenAt: now,
  };
}

export function mergeDiscoveredSources(registry, candidates, now = new Date().toISOString()) {
  const existing = new Map((registry.sources ?? []).map((source) => [source.id, { ...source }]));
  for (const candidate of candidates.filter(Boolean)) {
    const current = [...existing.values()].find((source) => canonicalSourceUrl(source.url) === candidate.url);
    if (current) {
      current.kinds = [...new Set([...(current.kinds ?? []), ...candidate.kinds])];
      if (current.origin === "discovered") current.lastSeenAt = now;
      continue;
    }
    existing.set(candidate.id, candidate);
  }

  const manual = [...existing.values()].filter((source) => source.origin !== "discovered");
  const manualUrls = new Set(manual.map((source) => canonicalSourceUrl(source.url)));
  const discovered = [...existing.values()]
    .filter((source) => source.origin === "discovered" && isAllowedSourceUrl(source.url) && !manualUrls.has(canonicalSourceUrl(source.url)))
    .sort((left, right) => (right.lastSeenAt ?? "").localeCompare(left.lastSeenAt ?? ""))
    .slice(0, MAX_DISCOVERED_SOURCES);

  return { version: 1, lastDiscoveryAt: now, sources: [...manual, ...discovered] };
}

export function restoreDiscoveredSources(registry, previousRegistry) {
  const manual = (registry.sources ?? []).filter((source) => source.origin !== "discovered");
  const manualUrls = new Set(manual.map((source) => canonicalSourceUrl(source.url)));
  const discovered = new Map();

  for (const source of [...(registry.sources ?? []), ...(previousRegistry?.sources ?? [])]) {
    const url = canonicalSourceUrl(source.url);
    if (source.origin !== "discovered" || !url || manualUrls.has(url) || !isAllowedSourceUrl(url)) continue;
    const current = discovered.get(url);
    if (!current || (source.lastSeenAt ?? "") > (current.lastSeenAt ?? "")) discovered.set(url, source);
  }

  return {
    version: 1,
    lastDiscoveryAt: [registry.lastDiscoveryAt, previousRegistry?.lastDiscoveryAt].filter(Boolean).sort().at(-1) ?? "",
    sources: [...manual, ...discovered.values()],
  };
}

function shouldDiscover(registry, force) {
  if (force || !registry.lastDiscoveryAt) return true;
  return Date.now() - new Date(registry.lastDiscoveryAt).getTime() >= DISCOVERY_INTERVAL_MS;
}

async function readRegistry(fileName = SOURCE_FILE) {
  return readFile(`${DATA_DIR}/${fileName}`, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => ({ version: 1, lastDiscoveryAt: "", sources: [] }));
}

async function saveRegistry(registry) {
  await mkdir(DATA_DIR, { recursive: true });
  const target = `${DATA_DIR}/${SOURCE_FILE}`;
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

async function discoverCandidates(page) {
  const candidates = [];
  for (const [kind, queries] of Object.entries(DISCOVERY_QUERIES)) {
    for (const query of queries) {
      const navigationError = await page.goto(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 30_000 })
        .then(() => "")
        .catch((error) => error.message);
      if (navigationError) {
        console.error(`shop source discovery skipped ${query}: ${navigationError}`);
        continue;
      }
      await page.waitForTimeout(800);
      const links = await page.evaluate(() => [...document.querySelectorAll("a[href]")]
        .map((anchor) => ({ href: anchor.href, text: (anchor.innerText || anchor.textContent || "").replace(/\s+/g, " ").trim() }))
        .filter((item) => /^https?:/.test(item.href)));
      candidates.push(...links.map((item) => sourceCandidate(item.href, item.text, kind)));
    }
  }
  return candidates;
}

async function main() {
  const restoreFile = process.argv.find((arg) => arg.startsWith("--restore="))?.slice("--restore=".length);
  const registry = restoreFile
    ? restoreDiscoveredSources(await readRegistry(), await readRegistry(restoreFile))
    : await readRegistry();
  const force = process.argv.includes("--force");
  if (!shouldDiscover(registry, force)) {
    await saveRegistry(registry);
    process.stdout.write("shop source discovery skipped: recent registry\n");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: "ko-KR", userAgent: MOBILE_UA });
    const candidates = await discoverCandidates(page);
    const next = mergeDiscoveredSources(registry, candidates);
    await saveRegistry(next);
    process.stdout.write(`shop source discovery: ${registry.sources?.length ?? 0} -> ${next.sources.length}\n`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
