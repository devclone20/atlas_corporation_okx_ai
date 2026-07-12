// Structural validation of a generated Harness Architecture document.
// Mirrors packages/blueprint/SKELETON.md: sections 1-7 and 9-13 are mandatory;
// 8 (Money & Custody) and 14 (Open Items) are conditional.

const REQUIRED_SECTIONS = [
  "## 1. Overview",
  "## 2. Executive Summary",
  "## 3. Problem Analysis",
  "## 4. Data Sources & Intake",
  "## 5. The Team",
  "## 6. Workflows",
  "## 7. Gates & Quality Control",
  "## 9. Schedule & Automation",
  "## 10. Event Log & Audit",
  "## 11. Build Instructions",
  "## 12. Acceptance Tests",
  "## 13. Maintenance & Upgrades",
];

export function validateDocument(markdown) {
  const errors = [];
  const warnings = [];

  for (const heading of REQUIRED_SECTIONS) {
    if (!markdown.includes(heading)) errors.push(`missing section: "${heading}"`);
  }
  if (!/^# .+/m.test(markdown)) errors.push("missing top-level title (# ...)");

  // The team section must contain at least one role-contract file block.
  const teamIdx = markdown.indexOf("## 5. The Team");
  const nextIdx = markdown.indexOf("## 6. Workflows");
  if (teamIdx !== -1 && nextIdx > teamIdx) {
    const team = markdown.slice(teamIdx, nextIdx);
    if (!/```/.test(team)) errors.push("section 5 has no fenced role-contract files");
    if (!/\|.+\|/.test(team)) warnings.push("section 5 has no roster table");
  }

  // Mandatory grammar markers.
  for (const marker of ["Evaluator", "Safety", "Owner"]) {
    if (!markdown.includes(marker)) errors.push(`gate "${marker}" never mentioned`);
  }
  if (!/exit.state|exit state/i.test(markdown)) {
    warnings.push("no mention of exit-state tokens");
  }

  // Never-list violations.
  if (/guaranteed (profit|earnings|returns)/i.test(markdown)) {
    errors.push('claims "guaranteed profit/earnings" (forbidden)');
  }

  return { ok: errors.length === 0, errors, warnings };
}
