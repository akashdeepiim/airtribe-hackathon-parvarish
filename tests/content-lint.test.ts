import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
it('fails CI for every banned term in approved milestone copy without echoing the copy', () => {
  const directory = mkdtempSync(join(tmpdir(), 'parvarish-copy-'));
  try {
    for (const word of ['delay', 'delayed', 'abnormal', 'behind', 'should have', 'worry']) {
      const file = join(directory, 'copy.json');
      writeFileSync(
        file,
        JSON.stringify([
          { clinical_review_status: 'approved', title: `TEST ${word.toUpperCase()} TEST` },
        ]),
      );
      const result = spawnSync(process.execPath, ['scripts/lint-content.mjs', file], {
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Disallowed milestone wording');
      expect(result.stderr).not.toContain(`TEST ${word.toUpperCase()} TEST`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
