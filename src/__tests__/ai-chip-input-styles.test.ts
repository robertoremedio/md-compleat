import { describe, it, expect } from 'vitest';
import { MdCompleat } from '../md-compleat.js';
import { AiHighlight } from '../extensions/ai-highlight.js';

function getStylesheetText(): string {
  const styles = (MdCompleat as any).styles;
  if (!styles) return '';
  if (Array.isArray(styles)) {
    return styles.map((s: any) => s.cssText ?? '').join('\n');
  }
  return styles.cssText ?? '';
}

/** Body of the first rule whose selector list matches `selector`, or ''. */
function ruleBody(css: string, selector: RegExp): string {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain))) {
    if (selector.test(m[1].trim())) return m[2];
  }
  return '';
}

describe('AI chip edit box and highlight styles', () => {
  const css = getStylesheetText();

  it('styles .ai-chip__input to fill the chip and inherit the font', () => {
    const body = ruleBody(css, /^\.ai-chip__input$/);
    expect(body).toMatch(/flex:\s*1|width:\s*100%/);
    expect(body).toMatch(
      /font:\s*inherit|font-family:\s*var\(--md-compleat-font-mono\)/,
    );
    expect(body).toMatch(/border/);
    expect(body).toMatch(/background/);
  });

  it('keeps highlighted text in the surrounding color', () => {
    expect(ruleBody(css, /^mark\[data-ai-highlight\]$/)).toMatch(
      /color:\s*inherit/,
    );
    const [, attrs] = (AiHighlight.config.renderHTML as any).call(
      {},
      { HTMLAttributes: {} },
    );
    expect(attrs.style).toMatch(/color:\s*inherit/);
  });

  it('only uses custom properties defined on :host', () => {
    const used = new Set(
      [...css.matchAll(/var\((--_[\w-]+)/g)].map((m) => m[1]),
    );
    const undefinedVars = [...used].filter(
      (name) => !new RegExp(`${name}\\s*:`).test(css),
    );
    expect(undefinedVars).toEqual([]);
  });
});
