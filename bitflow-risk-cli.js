import { writeFile } from "node:fs/promises";
import { fetchBitflowSnapshot } from "./bitflow-risk.js";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !arg.startsWith("--output="))) {
  throw new Error("Usage: node bitflow-risk-cli.js [--output=path]");
}
const report = await fetchBitflowSnapshot();
const json = JSON.stringify(report, null, 2) + "\n";
if (args[0]) await writeFile(args[0].slice(9), json);
else process.stdout.write(json);
