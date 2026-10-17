#!/usr/bin/env node
// Local development media server for ignored RC Recall derivatives. Loopback only,
// read-only, byte-range aware so <video> can seek. Not for deployment.
//
//   node scripts/rc-recall-media/serve.mjs      (port 8787, or RC_RECALL_MEDIA_PORT)
//   VITE_RC_RECALL_MEDIA_BASE=http://127.0.0.1:8787 npm run dev
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { OUTPUT_ROOT } from "./config.mjs";

const port = Number(process.env.RC_RECALL_MEDIA_PORT ?? 8787);
const types = { ".mp4": "video/mp4", ".vtt": "text/vtt", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };

http.createServer((req, res) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Accept-Ranges": "bytes" };
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, ""); }
  catch { res.writeHead(400, headers).end("Bad request"); return; }
  const file = path.resolve(OUTPUT_ROOT, rel);
  if (!file.startsWith(OUTPUT_ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, headers).end("Not found"); return;
  }
  const size = fs.statSync(file).size;
  const type = types[path.extname(file)] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range) {
    const suffix = !range[1] && Boolean(range[2]);
    const length = suffix ? Number(range[2]) : null;
    const start = suffix ? Math.max(0, size - length) : (range[1] ? Number(range[1]) : 0);
    const end = suffix ? size - 1 : (range[2] ? Math.min(Number(range[2]), size - 1) : size - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || end < start) {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` }).end(); return;
    }
    res.writeHead(206, { ...headers, "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...headers, "Content-Type": type, "Content-Length": size });
    fs.createReadStream(file).pipe(res);
  }
}).listen(port, "127.0.0.1", () => console.log(`Serving ${OUTPUT_ROOT} at http://127.0.0.1:${port}`));
