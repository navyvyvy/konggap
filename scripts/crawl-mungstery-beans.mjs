import { mkdir, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://mungstery.com/api/all/beans";
const OUTPUT_PATH = "data/mungstery-beans.json";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanText(value = "") {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/(구매하기|https?:\/\/|smartstore|youtu\.be|youtube|유튜브)/i.test(line))
    .join("\n")
    .trim();
}

function normalizeRoastingPoint(value = "") {
  const trimmed = value.trim();
  return trimmed && /배$/.test(trimmed) ? `${trimmed}전` : trimmed;
}

function normalizeBean(item) {
  return {
    id: item.uuid,
    name: item.name?.trim() ?? "",
    roaster: item.roaster?.trim() ?? "",
    roastingPoint: normalizeRoastingPoint(item.roastingPoint),
    notes: unique([...(item.noteBackend ?? []), ...(item.notes ?? []).map((note) => note.name)]),
    origins: unique(item.locations ?? []),
    components: (item.beans ?? []).map((bean) => ({
      name: bean.name ?? "",
      origin: bean.location ?? "",
      description: cleanText(bean.data ?? ""),
      blend: bean.blend ?? null,
    })),
    description: cleanText(item.etc),
    createdAt: item.created ? new Date(item.created * 1000).toISOString() : "",
    updatedAt: item.lastModified ? new Date(item.lastModified * 1000).toISOString() : "",
  };
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Mungstery fetch failed: ${response.status}`);

  const items = await response.json();
  const beans = items.map(normalizeBean).filter((bean) => bean.id && bean.name);
  const payload = {
    source: "mungstery",
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
