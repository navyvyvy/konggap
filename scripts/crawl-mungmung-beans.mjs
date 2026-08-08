import { mkdir, readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = process.env.MUNGMUNG_SOURCE_URL ?? "https://mungmung.site/productsMung.json";
const OUTPUT_PATH = "data/mungmung-beans.json";
const REQUEST_TIMEOUT_MS = Number(process.env.MUNGMUNG_TIMEOUT_MS) || 12_000;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRoastingPoint(name = "") {
  return name.match(/(극약배전|중약배전|중강배전|약배전|중배전|강배전)/)?.[1] ?? "";
}

function normalizeBean(item) {
  const notes = item.noteProfile?.tags ?? item.noteProfile?.notes?.map((note) => note.label) ?? [];
  const dateAdded = String(item.dateAdded ?? "");
  return {
    id: String(item.naverProductId ?? item.channelProductId ?? item.id ?? ""),
    name: item.name?.trim() ?? "",
    roaster: item.roastery?.trim() ?? "",
    roastingPoint: normalizeRoastingPoint(item.name),
    notes: unique(notes),
    origins: unique([item.country]),
    components: [{
      name: item.name?.trim() ?? "",
      origin: item.country?.trim() ?? "",
      description: unique([item.process, ...notes]).join(", "),
      blend: item.blend ?? null,
    }],
    description: unique([item.process, ...notes]).join(", "),
    createdAt: dateAdded.length === 8 ? `${dateAdded.slice(0, 4)}-${dateAdded.slice(4, 6)}-${dateAdded.slice(6, 8)}` : "",
    updatedAt: item.noteProfile?.checkedAt ?? "",
  };
}

async function main() {
  let items;
  try {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Mungmung fetch failed: ${response.status}`);
    const payload = await response.json();
    items = Array.isArray(payload) ? payload : payload.products ?? payload.data?.products;
    if (!Array.isArray(items)) throw new Error("Mungmung response has no product list");
  } catch (error) {
    const previous = await readFile(OUTPUT_PATH, "utf8").then(JSON.parse).catch(() => null);
    if (!Array.isArray(previous?.beans) || previous.beans.length === 0) throw error;
    process.stdout.write(`${OUTPUT_PATH} 갱신 실패, 기존 데이터 ${previous.beans.length}개 유지\n`);
    return;
  }

  const beans = items.filter((item) => !item.soldOut).map(normalizeBean).filter((bean) => bean.id && bean.name);
  const payload = {
    source: "mungmung",
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    count: beans.length,
    beans,
  };

  await mkdir("data", { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`${OUTPUT_PATH} ${beans.length}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
