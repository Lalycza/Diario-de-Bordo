import { createClient } from "@supabase/supabase-js";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const root = path.resolve("backup/storage");
let downloaded = 0;

async function downloadFile(bucket, objectPath) {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw new Error(`Falha ao baixar ${bucket}/${objectPath}: ${error.message}`);
  const destination = path.join(root, bucket, ...objectPath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await pipeline(Readable.fromWeb(data.stream()), createWriteStream(destination));
  downloaded += 1;
}

async function walk(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`Falha ao listar ${bucket}/${prefix}: ${error.message}`);
  for (const item of data ?? []) {
    if (item.name === "." || item.name === "..") continue;
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      await walk(bucket, itemPath);
    } else {
      await downloadFile(bucket, itemPath);
    }
  }
}

const { data: buckets, error } = await supabase.storage.listBuckets();
if (error) throw new Error(`Falha ao listar buckets: ${error.message}`);
for (const bucket of buckets ?? []) {
  await walk(bucket.name);
  console.log(`Storage: bucket ${bucket.name} processado.`);
}
console.log(`Total de objetos baixados: ${downloaded}`);
