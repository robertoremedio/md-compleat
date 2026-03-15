import { Node, mergeAttributes } from '@tiptap/core';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export const AiDirective = Node.create({
  name: 'aiDirective',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      instruction: { default: '' },
      variant: { default: 'self-closing' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'ai',
        getAttrs(element) {
          const el = element as HTMLElement;
          const variant = el.getAttribute('data-variant');
          const attrInstruction = el.getAttribute('instruction');
          if (variant === 'block') {
            return { instruction: attrInstruction || '', variant: 'block' };
          }
          if (attrInstruction !== null) {
            return { instruction: attrInstruction, variant: 'self-closing' };
          }
          // Legacy fallback: block form stored as text content
          return { instruction: el.textContent || '', variant: 'block' };
        },
      },
    ];
  },

  renderHTML({ node }) {
    if (node.attrs.variant === 'block') {
      return ['ai', { instruction: node.attrs.instruction, 'data-variant': 'block' }];
    }
    return ['ai', mergeAttributes({ instruction: node.attrs.instruction })];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          if (node.attrs.variant === 'block') {
            state.write(
              `<ai>${node.attrs.instruction}</ai>`,
            );
          } else {
            state.write(
              `<ai instruction="${escapeAttr(node.attrs.instruction)}" />`,
            );
          }
          state.closeBlock(node);
        },
        parse: {
          setup(md: any) {
            md.block.ruler.before(
              'html_block',
              'ai_directive',
              (state: any, startLine: number, endLine: number, silent: boolean) => {
                const pos = state.bMarks[startLine] + state.tShift[startLine];
                const max = state.eMarks[startLine];
                const line = state.src.slice(pos, max);

                if (!line.startsWith('<ai')) return false;
                if (silent) return true;

                // Self-closing: <ai ... />
                if (/^<ai\s[^>]*\/>$/.test(line.trim())) {
                  const token = state.push('html_block', '', 0);
                  // Use explicit closing tag — HTML doesn't support self-closing custom elements
                  token.content = line.replace(/\s*\/>$/, '></ai>') + '\n';
                  token.map = [startLine, startLine + 1];
                  state.line = startLine + 1;
                  return true;
                }

                // Block form: find </ai> on same or subsequent lines
                let nextLine = startLine;
                for (nextLine = startLine; nextLine < endLine; nextLine++) {
                  const lpos = state.bMarks[nextLine] + state.tShift[nextLine];
                  const lmax = state.eMarks[nextLine];
                  const l = state.src.slice(lpos, lmax);
                  if (l.includes('</ai>')) {
                    nextLine++;
                    break;
                  }
                }

                // Extract raw content between <ai> and </ai>, store as attribute
                // to avoid encode/decode/re-encode cycles with text content
                const rawContent = state.getLines(
                  startLine,
                  nextLine,
                  state.blkIndent,
                  true,
                );
                const innerMatch = rawContent.match(
                  /^<ai>([\s\S]*?)<\/ai>/,
                );
                let tokenContent: string;
                if (innerMatch) {
                  const inner = innerMatch[1]
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;');
                  tokenContent = `<ai instruction="${inner}" data-variant="block"></ai>\n`;
                } else {
                  tokenContent = rawContent;
                }

                const token = state.push('html_block', '', 0);
                token.content = tokenContent;
                token.map = [startLine, nextLine];
                state.line = nextLine;
                return true;
              },
            );
          },
        },
      },
    };
  },
});
