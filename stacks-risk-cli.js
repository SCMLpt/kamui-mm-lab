import { writeFile } from "node:fs/promises";
import { fetchSbtcSnapshot } from "./stacks-risk.js";

const args = process.argv.slice(2);
if (args.length > 2 || args.some((arg) => !arg.startsWith("--limit=") && !arg.startsWith("--output="))) {
  throw new Error("Usage: node stacks-risk-cli.js [--limit=N] [--output=path]");
}
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const limit = limitArg ? Number(limitArg.slice(8)) : 100;
const report = await fetchSbtcSnapshot({ limit });
const json = JSON.stringify(report, null, 2) + "\n";
if (outputArg) await writeFile(outputArg.slice(9), json);
else process.stdout.write(json);
