import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, sep } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4174);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  if (!(file === root || file.startsWith(root + sep)) || !Object.keys(types).some((extension) => file.endsWith(extension))) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(file);
    const type = types[Object.keys(types).find((extension) => file.endsWith(extension))];
    response.writeHead(200, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" }).end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Kamui MM Lab → http://127.0.0.1:${port}/`));
