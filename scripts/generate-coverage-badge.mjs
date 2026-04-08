import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve("coverage/coverage-summary.json");
const outputPath = path.resolve("docs/badges/coverage.svg");

let label = "coverage";
let message = "pending";
let color = "#9ca3af";

if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const totalPct = Number(summary?.total?.lines?.pct ?? 0);

  message = `${totalPct}%`;
  color =
    totalPct >= 85
      ? "#16a34a"
      : totalPct >= 70
        ? "#65a30d"
        : totalPct >= 50
          ? "#ca8a04"
          : "#dc2626";
}

const labelWidth = 74;
const messageWidth = Math.max(52, message.length * 9 + 16);
const width = labelWidth + messageWidth;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${message}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="round">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#round)">
    <rect width="${labelWidth}" height="20" fill="#111827"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15">${message}</text>
  </g>
</svg>
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svg);
