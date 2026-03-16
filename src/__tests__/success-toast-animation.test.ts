import { describe, it, expect } from 'vitest';
import { MdCompleat } from '../md-compleat.js';

/**
 * Extract the full CSS text from the component's static styles.
 */
function getStylesheetText(): string {
  const styles = (MdCompleat as any).styles;
  if (!styles) return '';
  if (Array.isArray(styles)) {
    return styles.map((s: any) => s.cssText ?? '').join('\n');
  }
  return styles.cssText ?? '';
}

// ---------------------------------------------------------------------------
// Success toast animation: separate keyframes without translateX(-50%)
// The success toast uses right-aligned positioning (right: 8px), so it must
// NOT use the error toast's keyframes which include translateX(-50%).
// ---------------------------------------------------------------------------
describe('success toast animation keyframes', () => {
  it('defines md-compleat-success-toast-in keyframes', () => {
    const css = getStylesheetText();
    expect(css).toContain('@keyframes md-compleat-success-toast-in');
  });

  it('success toast keyframes do not include translateX(-50%)', () => {
    const css = getStylesheetText();
    // Extract the success toast keyframes block
    const match = css.match(
      /@keyframes\s+md-compleat-success-toast-in\s*\{([\s\S]*?\})\s*\}/,
    );
    expect(match).not.toBeNull();
    const keyframeBody = match![1];
    expect(keyframeBody).not.toContain('translateX(-50%)');
  });

  it('success toast keyframes include translateY for vertical slide', () => {
    const css = getStylesheetText();
    const match = css.match(
      /@keyframes\s+md-compleat-success-toast-in\s*\{([\s\S]*?\})\s*\}/,
    );
    expect(match).not.toBeNull();
    const keyframeBody = match![1];
    expect(keyframeBody).toContain('translateY(');
  });

  it('success toast uses md-compleat-success-toast-in animation', () => {
    const css = getStylesheetText();
    // Match the .ai-success-toast rule block and check its animation property
    const match = css.match(
      /\.ai-success-toast\s*\{([^}]*)\}/,
    );
    expect(match).not.toBeNull();
    const ruleBody = match![1];
    expect(ruleBody).toContain('md-compleat-success-toast-in');
  });

  it('error toast still uses the original md-compleat-toast-in animation', () => {
    const css = getStylesheetText();
    const match = css.match(
      /\.ai-error-toast\s*\{([^}]*)\}/,
    );
    expect(match).not.toBeNull();
    const ruleBody = match![1];
    expect(ruleBody).toContain('md-compleat-toast-in');
    // Should NOT use the success-specific keyframes
    expect(ruleBody).not.toContain('md-compleat-success-toast-in');
  });

  it('original toast-in keyframes still include translateX(-50%) for error toast', () => {
    const css = getStylesheetText();
    // The original keyframes should still exist with translateX(-50%)
    const match = css.match(
      /@keyframes\s+md-compleat-toast-in\s*\{([\s\S]*?\})\s*\}/,
    );
    expect(match).not.toBeNull();
    const keyframeBody = match![1];
    expect(keyframeBody).toContain('translateX(-50%)');
  });
});
