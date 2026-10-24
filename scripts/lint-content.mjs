import { readFileSync } from 'node:fs';
// The CSV importer in Phase 4 must produce this clinically reviewed content boundary.
// Do not scan the PRD or test fixtures: they document banned words rather than display them.
const file = process.argv[2] ?? new URL('../src/content/milestones.json', import.meta.url);
const rows = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(rows)) throw new Error('Milestone content must be an array');
const banned = /\b(delay|delayed|abnormal|behind|should\s+have|worry)\b/i;
const fields = ['title', 'prompt_question', 'reassurance_copy', 'consult_copy', 'did_you_know'];
let failures = 0;
for (const [index, row] of rows.entries()) {
  if (row.clinical_review_status !== 'approved') continue;
  for (const field of fields)
    if (typeof row[field] === 'string' && banned.test(row[field])) {
      // Print only the location, never the copy or any names in it.
      process.stderr.write(`Disallowed milestone wording: row ${index + 1}, field ${field}\n`);
      failures++;
    }
}
if (failures) process.exitCode = 1;
else process.stdout.write('Milestone copy check passed.\n');
