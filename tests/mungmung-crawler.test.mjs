import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const crawlerPath = resolve("scripts/crawl-mungmung-beans.mjs");

test("Mungmung timeout keeps the previous snapshot and continues", async () => {
  const workdir = await mkdtemp(join(tmpdir(), "konggap-mungmung-"));
  const server = createServer(() => {});
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  const previous = { source: "mungmung", fetchedAt: "2026-01-01T00:00:00.000Z", count: 1, beans: [{ id: "saved", name: "기존 원두" }] };

  try {
    await mkdir(join(workdir, "data"));
    await writeFile(join(workdir, "data", "mungmung-beans.json"), JSON.stringify(previous), "utf8");
    const { stdout } = await execFileAsync(process.execPath, [crawlerPath], {
      cwd: workdir,
      env: {
        ...process.env,
        MUNGMUNG_SOURCE_URL: `http://127.0.0.1:${port}`,
        MUNGMUNG_TIMEOUT_MS: "50",
      },
    });

    assert.match(stdout, /기존 데이터 1개 유지/);
    assert.deepEqual(JSON.parse(await readFile(join(workdir, "data", "mungmung-beans.json"), "utf8")), previous);
  } finally {
    server.closeAllConnections();
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(workdir, { recursive: true, force: true });
  }
});
