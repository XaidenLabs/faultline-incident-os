import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIncidentOS, renderIncidentReport } from "./incident-os.mjs";
import { scenarios } from "./scenarios.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "artifacts", "incident-packages");
await mkdir(outputDir, { recursive: true });

for (const scenario of [scenarios[0], scenarios.find((item) => item.id === "INC-2492")]) {
  const pkg = runIncidentOS(scenario);
  const base = scenario.id.toLowerCase();
  await writeFile(path.join(outputDir, `${base}.json`), `${JSON.stringify(pkg, null, 2)}\n`);
  await writeFile(path.join(outputDir, `${base}.md`), renderIncidentReport(pkg));
  console.log(`${scenario.id}: ${Object.entries(pkg.lifecycle).map(([stage, status]) => `${stage}=${status}`).join(" · ")}`);
}

console.log(`Artifacts: ${path.relative(root, outputDir)}`);
