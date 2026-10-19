import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("backup");
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name !== "manifest.json" && entry.name !== "SHA256SUMS.txt") {
      const bytes = await readFile(full);
      const info = await stat(full);
      files.push({
        path: path.relative(root, full).split(path.sep).join("/"),
        size_bytes: info.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
}
await walk(root);
if (!files.some((f) => f.path === "schema.sql") || !files.some((f) => f.path === "data.sql")) {
  throw new Error("Backup incompleto: schema.sql ou data.sql ausente.");
}
const manifest = {
  format: "implanta-supabase-backup-v1",
  created_at: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? "unknown",
  workflow_run_id: process.env.GITHUB_RUN_ID ?? null,
  includes_storage: files.some((f) => f.path.startsWith("storage/")),
  file_count: files.length,
  total_bytes: files.reduce((sum, file) => sum + file.size_bytes, 0),
  files,
};
await writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  path.join(root, "SHA256SUMS.txt"),
  files.map((file) => `${file.sha256}  ${file.path}`).join("\n") + "\n",
);
console.log(`Manifesto criado: ${files.length} arquivos, ${manifest.total_bytes} bytes.`);
