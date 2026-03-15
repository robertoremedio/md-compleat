import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Verify that the closing backtick of the `static override styles = css`
 * template literal in md-compleat.ts is properly indented to match the
 * class body (2-space indent), not flush-left.
 */
describe('css template literal indentation', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'md-compleat.ts'),
    'utf-8',
  );
  const lines = source.split('\n');

  it('closing backtick of css template literal has 2-space indent', () => {
    // Find the line that closes the css template literal (standalone `; line)
    const closingIndex = lines.findIndex(
      (line, i) =>
        /^\s*`;\s*$/.test(line) &&
        // Must come after the `static override styles = css`` opening
        lines.slice(0, i).some((l) => /static\s+override\s+styles\s*=\s*css`/.test(l)),
    );

    expect(closingIndex).toBeGreaterThan(-1);

    const closingLine = lines[closingIndex];
    // The line should start with exactly 2 spaces before the backtick
    expect(closingLine).toMatch(/^  `;\s*$/);
  });

  it('closing backtick aligns with other class-level members', () => {
    // Find the @property line that follows the css block
    const propertyLine = lines.find((l) =>
      /@property\(\{.*\}\)\s+content/.test(l),
    );
    expect(propertyLine).toBeDefined();

    // Extract indent of the @property declaration
    const propertyIndent = propertyLine!.match(/^(\s*)/)?.[1] ?? '';

    // Find the closing `; line
    const closingLine = lines.find(
      (l, i) =>
        /^\s*`;\s*$/.test(l) &&
        lines.slice(0, i).some((prev) => /static\s+override\s+styles\s*=\s*css`/.test(prev)),
    );
    expect(closingLine).toBeDefined();

    const closingIndent = closingLine!.match(/^(\s*)/)?.[1] ?? '';

    // Both should have the same indentation (2 spaces for class body)
    expect(closingIndent).toBe(propertyIndent);
  });
});
