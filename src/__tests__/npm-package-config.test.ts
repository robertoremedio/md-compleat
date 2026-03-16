import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..', '..');

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('package.json configuration', () => {
  const pkg = readJson('package.json');

  describe('entry points', () => {
    it('should set main to UMD bundle for CJS consumers', () => {
      expect(pkg.main).toBe('./dist/md-compleat.umd.cjs');
    });

    it('should set module to ESM bundle', () => {
      expect(pkg.module).toBe('./dist/md-compleat.js');
    });

    it('should set types to declaration file', () => {
      expect(pkg.types).toBe('./dist/index.d.ts');
    });
  });

  describe('exports map', () => {
    it('should have conditional exports with types, import, and require', () => {
      expect(pkg.exports).toEqual({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/md-compleat.js',
          require: './dist/md-compleat.umd.cjs',
        },
        './standalone': {
          types: './dist/index.d.ts',
          import: './dist/md-compleat.standalone.js',
        },
      });
    });

    it('should list types first in exports for TypeScript resolution', () => {
      const keys = Object.keys(pkg.exports['.']);
      expect(keys[0]).toBe('types');
    });
  });

  describe('files field', () => {
    it('should include dist and custom-elements.json', () => {
      expect(pkg.files).toContain('dist');
      expect(pkg.files).toContain('custom-elements.json');
    });

    it('should not include src or dev directories', () => {
      expect(pkg.files).not.toContain('src');
      expect(pkg.files).not.toContain('dev');
    });
  });

  describe('customElements field', () => {
    it('should point to custom-elements.json', () => {
      expect(pkg.customElements).toBe('custom-elements.json');
    });
  });

  describe('build script', () => {
    it('should include CEM analyze step', () => {
      expect(pkg.scripts.build).toContain('cem analyze');
    });
  });

  describe('analyze script', () => {
    it('should have an analyze script for CEM', () => {
      expect(pkg.scripts.analyze).toBeDefined();
      expect(pkg.scripts.analyze).toContain('cem analyze');
    });
  });
});

describe('Vite build configuration', () => {
  // Read vite.config.ts as text to verify configuration
  const viteConfig = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf-8');

  it('should include UMD format', () => {
    // Config should have both 'es' and 'umd' formats
    expect(viteConfig).toMatch(/formats.*umd/s);
  });

  it('should define a UMD global name', () => {
    // UMD requires a name for the global variable
    expect(viteConfig).toMatch(/name.*MdCompleat/s);
  });

  it('should define rollup output globals for externalized packages', () => {
    // UMD needs globals mapping for external deps
    expect(viteConfig).toMatch(/globals/);
  });
});

describe('build output files', () => {
  it('should produce ESM bundle', () => {
    expect(existsSync(resolve(ROOT, 'dist/md-compleat.js'))).toBe(true);
  });

  it('should produce UMD bundle', () => {
    expect(existsSync(resolve(ROOT, 'dist/md-compleat.umd.cjs'))).toBe(true);
  });

  it('should produce type declarations', () => {
    expect(existsSync(resolve(ROOT, 'dist/index.d.ts'))).toBe(true);
  });
});

describe('custom-elements.json manifest', () => {
  it('should exist in project root', () => {
    expect(existsSync(resolve(ROOT, 'custom-elements.json'))).toBe(true);
  });

  // Guard: only parse if file exists (remaining tests will fail on the first assertion anyway)
  const cemPath = resolve(ROOT, 'custom-elements.json');
  const cem = existsSync(cemPath)
    ? JSON.parse(readFileSync(cemPath, 'utf-8'))
    : null;

  it('should follow CEM schema version 1 or 2', () => {
    expect(cem).not.toBeNull();
    expect(cem!.schemaVersion).toMatch(/^[12]/);
  });

  it('should declare the md-compleat custom element', () => {
    expect(cem).not.toBeNull();
    const allDeclarations = cem!.modules?.flatMap(
      (m: any) => m.declarations ?? [],
    );
    const mdCompleat = allDeclarations?.find(
      (d: any) => d.tagName === 'md-compleat',
    );
    expect(mdCompleat).toBeDefined();
  });

  it('should list all 7 public properties', () => {
    expect(cem).not.toBeNull();
    const allDeclarations = cem!.modules?.flatMap(
      (m: any) => m.declarations ?? [],
    );
    const mdCompleat = allDeclarations?.find(
      (d: any) => d.tagName === 'md-compleat',
    );
    const memberNames = mdCompleat?.members
      ?.filter((m: any) => m.kind === 'field' && m.privacy !== 'private')
      .map((m: any) => m.name);

    const expectedProperties = [
      'content',
      'aiShortcut',
      'aiExecuteShortcut',
      'aiProviderName',
      'aiEndpoint',
      'aiCliCommand',
      'aiProxyHeaders',
    ];

    for (const prop of expectedProperties) {
      expect(memberNames).toContain(prop);
    }
  });

  it('should list CSS custom properties', () => {
    expect(cem).not.toBeNull();
    const allDeclarations = cem!.modules?.flatMap(
      (m: any) => m.declarations ?? [],
    );
    const mdCompleat = allDeclarations?.find(
      (d: any) => d.tagName === 'md-compleat',
    );
    const cssProps = mdCompleat?.cssProperties?.map((p: any) => p.name) ?? [];

    expect(cssProps.length).toBeGreaterThanOrEqual(13);
    expect(cssProps).toContain('--md-compleat-font-family');
    expect(cssProps).toContain('--md-compleat-max-width');
    expect(cssProps).toContain('--md-compleat-link-color');
    expect(cssProps).toContain('--md-compleat-ai-highlight');
  });
});

describe('README.md', () => {
  const readmePath = resolve(ROOT, 'README.md');
  const readmeExists = existsSync(readmePath);
  const readme = readmeExists ? readFileSync(readmePath, 'utf-8') : '';

  it('should exist', () => {
    expect(readmeExists).toBe(true);
  });

  it('should include installation instructions', () => {
    expect(readme).toMatch(/npm install/i);
  });

  it('should document all attributes', () => {
    const attributes = [
      'content',
      'ai-shortcut',
      'ai-execute-shortcut',
      'ai-provider',
      'ai-endpoint',
      'ai-cli-command',
      'ai-proxy-headers',
    ];
    for (const attr of attributes) {
      expect(readme).toContain(attr);
    }
  });

  it('should include proxy provider configuration example', () => {
    expect(readme).toMatch(/ai-provider.*proxy/s);
  });

  it('should include CLI provider configuration example', () => {
    expect(readme).toMatch(/ai-provider.*cli/s);
  });

  it('should include custom provider documentation', () => {
    expect(readme).toMatch(/createProvider|aiProvider/);
  });

  it('should document CSS custom properties', () => {
    expect(readme).toContain('--md-compleat-font-family');
    expect(readme).toContain('--md-compleat-max-width');
    expect(readme).toContain('--md-compleat-ai-highlight');
  });

  it('should include UMD/CDN usage section', () => {
    expect(readme).toMatch(/cdn|umd|script/i);
  });
});
