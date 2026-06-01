#!/usr/bin/env node
/**
 * Test generatePlannerPdf for client + concierge modes.
 *
 * Usage:
 *   BASE_URL=https://chambellan-conciergerie.vercel.app TRIP_ID=5 node scripts/test-generate-planner-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const tripId = Number(process.env.TRIP_ID ?? "5");
const outDir = path.join(__dirname, "..", "tmp");

async function main() {
  const modulePath = pathToFileURL(
    path.join(__dirname, "../src/lib/pdf/generate-planner-pdf.ts")
  ).href;
  const { generatePlannerPdf } = await import(modulePath);

  let exitCode = 0;
  for (const mode of ["client", "concierge"]) {
    process.stdout.write(`Generating ${mode} PDF for trip ${tripId}… `);
    try {
      const buffer = await generatePlannerPdf(tripId, mode, baseUrl);
      const header = buffer.subarray(0, 4).toString();
      if (!header.startsWith("%PDF") || buffer.length < 1000) {
        console.log("FAIL (invalid PDF)");
        exitCode = 1;
        continue;
      }
      const file = path.join(outDir, `api-test-${mode}-trip-${tripId}.pdf`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(file, buffer);
      console.log(`PASS ${buffer.length} bytes -> ${file}`);
    } catch (err) {
      console.log(`FAIL ${err instanceof Error ? err.message : err}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
