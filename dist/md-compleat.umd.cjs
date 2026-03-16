(function(e,t){typeof exports==`object`&&typeof module<`u`?t(exports,require(`lit`),require(`lit/decorators.js`),require(`@tiptap/core`),require(`@tiptap/starter-kit`),require(`tiptap-markdown`),require(`@tiptap/extension-image`),require(`@tiptap/extension-link`),require(`@tiptap/extension-table`),require(`@tiptap/extension-table-row`),require(`@tiptap/extension-table-header`),require(`@tiptap/extension-table-cell`),require(`@tiptap/pm/transform`),require(`@tiptap/pm/state`),require(`@tiptap/pm/history`),require(`@tiptap/pm/model`)):typeof define==`function`&&define.amd?define([`exports`,`lit`,`lit/decorators.js`,`@tiptap/core`,`@tiptap/starter-kit`,`tiptap-markdown`,`@tiptap/extension-image`,`@tiptap/extension-link`,`@tiptap/extension-table`,`@tiptap/extension-table-row`,`@tiptap/extension-table-header`,`@tiptap/extension-table-cell`,`@tiptap/pm/transform`,`@tiptap/pm/state`,`@tiptap/pm/history`,`@tiptap/pm/model`],t):(e=typeof globalThis<`u`?globalThis:e||self,t(e.MdCompleat={},e.Lit,e.Lit,e.TiptapCore,e.TiptapStarterKit,e.TiptapMarkdown,e.TiptapExtensionImage,e.TiptapExtensionLink,e.TiptapExtensionTable,e.TiptapExtensionTableRow,e.TiptapExtensionTableHeader,e.TiptapExtensionTableCell,e.TiptapPmTransform,e.TiptapPmState,e.TiptapPmHistory,e.TiptapPmModel))})(this,function(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var g=Object.create,_=Object.defineProperty,v=Object.getOwnPropertyDescriptor,y=Object.getOwnPropertyNames,b=Object.getPrototypeOf,x=Object.prototype.hasOwnProperty,S=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports),C=(e,t,n,r)=>{if(t&&typeof t==`object`||typeof t==`function`)for(var i=y(t),a=0,o=i.length,s;a<o;a++)s=i[a],!x.call(e,s)&&s!==n&&_(e,s,{get:(e=>t[e]).bind(null,s),enumerable:!(r=v(t,s))||r.enumerable});return e},w=(e,t,n)=>(n=e==null?{}:g(b(e)),C(t||!e||!e.__esModule?_(n,`default`,{value:e,enumerable:!0}):n,e));i=w(i),o=w(o),s=w(s),l=w(l),u=w(u),d=w(d);function T({node:e,editor:t,getPos:n}){let r=e,i=!1,a=!1,o=document.createElement(`div`);o.classList.add(`ai-chip`),o.setAttribute(`data-variant`,r.attrs.variant);let s=document.createElement(`span`);s.classList.add(`ai-chip__icon`),s.textContent=`▶`,o.appendChild(s);let c=document.createElement(`button`);c.classList.add(`ai-chip__toggle`),c.textContent=`⤢`,c.type=`button`,c.addEventListener(`click`,e=>{e.stopPropagation(),d({variant:r.attrs.variant===`self-closing`?`block`:`self-closing`})}),o.appendChild(c);let l=u();o.appendChild(l),r.attrs.instruction||queueMicrotask(()=>f(!0));function u(){let e=document.createElement(`span`);return e.classList.add(`ai-chip__instruction`),e.textContent=r.attrs.instruction,e.addEventListener(`click`,()=>f(!1)),e}function d(e){let i=typeof n==`function`?n():void 0;if(i==null)return;let{tr:a}=t.state;a.setNodeMarkup(i,void 0,{...r.attrs,...e}),t.view.dispatch(a)}function f(e){if(a||i)return;i=!0;let t=r.attrs.variant===`block`,n=t?document.createElement(`textarea`):document.createElement(`input`);t||(n.type=`text`),t&&(n.rows=4),n.value=r.attrs.instruction,n.classList.add(`ai-chip__input`);let o=()=>{a||(i=!1,d({instruction:n.value}),p())},s=()=>{a||(i=!1,p())};n.addEventListener(`keydown`,(e=>{e.key===`Enter`&&!t?(e.preventDefault(),n.removeEventListener(`blur`,o),o()):e.key===`Escape`&&(e.preventDefault(),n.removeEventListener(`blur`,o),s())})),l.replaceWith(n),e?setTimeout(()=>{a||!i||(n.addEventListener(`blur`,o),n.focus())},0):(n.addEventListener(`blur`,o),n.focus())}function p(){if(a)return;l=u();let e=o.querySelector(`input, textarea`);e?e.replaceWith(l):o.appendChild(l)}return{dom:o,contentDOM:null,update(e){return e.type===r.type?(r=e,o.setAttribute(`data-variant`,r.attrs.variant),i||(l.textContent=r.attrs.instruction),!0):!1},stopEvent(e){let t=e.target;return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t.classList?.contains(`ai-chip__toggle`)},ignoreMutation(){return!0},destroy(){a=!0}}}function E(e){return e.replace(/&/g,`&amp;`).replace(/"/g,`&quot;`)}var D=r.Node.create({name:`aiDirective`,group:`block`,atom:!0,addOptions(){return{shortcut:`Mod-Shift-A`}},addAttributes(){return{instruction:{default:``},variant:{default:`self-closing`}}},parseHTML(){return[{tag:`ai`,priority:60,getAttrs(e){let t=e;if(t.querySelector(`ai`)){let e=t.parentNode;if(e){let n=t.nextSibling;for(;t.firstChild;)e.insertBefore(t.firstChild,n)}}let n=t.getAttribute(`data-variant`),r=t.getAttribute(`instruction`);return n===`block`?{instruction:r||``,variant:`block`}:r===null?{instruction:t.textContent||``,variant:`block`}:{instruction:r,variant:`self-closing`}}}]},renderHTML({node:e}){return e.attrs.variant===`block`?[`ai`,{instruction:e.attrs.instruction,"data-variant":`block`}]:[`ai`,(0,r.mergeAttributes)({instruction:e.attrs.instruction})]},addNodeView(){return T},addCommands(){return{insertAiDirective:e=>({commands:t})=>t.insertContent({type:`aiDirective`,attrs:{instruction:e.instruction,variant:e.variant||`self-closing`}})}},addKeyboardShortcuts(){return{[this.options.shortcut]:({editor:e})=>(e.commands.insertAiDirective({instruction:``}),!0)}},addInputRules(){return[(0,r.nodeInputRule)({find:/^\/ai $/,type:this.type,getAttributes:()=>({instruction:``,variant:`self-closing`})})]},addStorage(){return{markdown:{serialize(e,t){t.attrs.variant===`block`?e.write(`<ai>${t.attrs.instruction}</ai>`):e.write(`<ai instruction="${E(t.attrs.instruction)}" />`),e.closeBlock(t)},parse:{setup(e){e.block.ruler.before(`html_block`,`ai_directive`,(e,t,n,r)=>{let i=e.bMarks[t]+e.tShift[t],a=e.eMarks[t],o=e.src.slice(i,a);if(!o.startsWith(`<ai`))return!1;if(r)return!0;if(/^<ai\s[^>]*\/>$/.test(o.trim())){let n=e.push(`html_block`,``,0);return n.content=o.replace(/\s*\/>$/,`></ai>`)+`
`,n.map=[t,t+1],e.line=t+1,!0}let s;for(s=t;s<n;s++){let t=e.bMarks[s]+e.tShift[s],n=e.eMarks[s];if(e.src.slice(t,n).includes(`</ai>`)){s++;break}}let c=e.getLines(t,s,e.blkIndent,!0),l=c.match(/^<ai>([\s\S]*?)<\/ai>/),u;u=l?`<ai instruction="${l[1].replace(/&/g,`&amp;`).replace(/"/g,`&quot;`)}" data-variant="block"></ai>\n`:c;let d=e.push(`html_block`,``,0);return d.content=u,d.map=[t,s],e.line=s,!0})}}}}}}),O=r.Mark.create({name:`aiHighlight`,parseHTML(){return[{tag:`mark[data-ai-highlight]`}]},renderHTML(){return[`mark`,{"data-ai-highlight":``,style:`background: var(--md-compleat-ai-highlight, rgba(74, 144, 226, 0.15))`},0]},addStorage(){return{markdown:{serialize:{open:``,close:``,mixable:!0},parse:{}}}},addProseMirrorPlugins(){let e=this.type;return[new p.Plugin({appendTransaction(t,n,r){if(!t.some(e=>e.docChanged&&e.steps.some(e=>!(e instanceof f.AddMarkStep)&&!(e instanceof f.RemoveMarkStep)))||t.some(e=>e.getMeta(`aiReplacement`))||t.some(e=>e.getMeta(`preventAutoRemove`)))return null;let i=!1;if(r.doc.descendants(t=>{if(t.marks?.some(t=>t.type===e))return i=!0,!1}),!i)return null;let a=r.tr;return a.setMeta(`preventAutoRemove`,!0),a.setMeta(`addToHistory`,!1),r.doc.descendants((t,n)=>{t.isText&&t.marks?.some(t=>t.type===e)&&a.removeMark(n,n+t.nodeSize,e)}),a}})]}}),k=new p.PluginKey(`aiSuggestion`),A=r.Extension.create({name:`aiSuggestion`,addProseMirrorPlugins(){let e=this.editor,t=null,n=-1;function r(){return e.options.element}function i(e){if(t)return;let n=r();t=document.createElement(`div`),t.classList.add(`ai-suggestion`),t.textContent=`Insert AI directive`,t.addEventListener(`mousedown`,e=>{e.preventDefault()}),t.addEventListener(`click`,()=>{o()});let i=n.getBoundingClientRect();t.style.position=`absolute`,t.style.left=`${e.left-i.left}px`,t.style.top=`${e.bottom-i.top}px`,n.appendChild(t)}function a(){t&&=(t.remove(),null),n=-1}function o(){if(n<0)return;let{state:t}=e.view,{$from:r}=t.selection,i=r.before(r.depth),o=r.after(r.depth),s=t.schema.nodes.aiDirective.create({instruction:``,variant:`self-closing`}),c=(0,m.closeHistory)(t.tr.replaceWith(i,o,s));e.view.dispatch(c),a()}return[new p.Plugin({key:k,props:{handleKeyDown(e,n){return t?n.key===`Enter`||n.key===`Tab`?(n.preventDefault(),o(),!0):n.key===`Escape`?(n.preventDefault(),a(),!0):!1:!1}},view(){return{update(e){let{state:r}=e,{$from:o}=r.selection,s=o.parent.textBetween(0,o.parentOffset,void 0,`￼`);if(s.match(/^\/ai$/)&&o.parentOffset===s.length){if(n=o.start(),!t){let t;try{t=e.coordsAtPos(o.pos)}catch{t={left:0,top:0,bottom:0}}i(t)}}else a()},destroy(){a()}}}})]}});function j(){return`You are a document processor. You receive a Markdown document and return it with modifications. You are NOT a chatbot. Do NOT converse, ask questions, or add commentary. Your entire response must be the processed Markdown document and nothing else.

The document contains <ai> directive tags. Process them as follows:

1. Self-closing: <ai instruction="Write a summary of the project" />
   Replace the entire tag with the generated content.

2. Block: <ai instruction="Rewrite this paragraph to be more concise">existing content here</ai>
   Replace the entire tag (including its content) with the improved version.

Rules:
- Your output must be ONLY the complete Markdown document with all <ai> tags replaced by generated content.
- Do not wrap the output in a code block or add any prefix/suffix.
- Do not alter any part of the document outside of <ai> tags.
- Preserve all formatting, headings, lists, code blocks, and other Markdown syntax exactly as they appear.
- If the document has no <ai> tags, return it unchanged.
- Never include explanations, greetings, or follow-up questions.`}function M(e,t){let n=e.storage.markdown.parser.parse(t),r=document.createElement(`div`);return r.innerHTML=n,h.DOMParser.fromSchema(e.schema).parse(r)}function N(e,t){let n=e.content,r=t.content,i=n.findDiffStart(r);if(i==null)return{ranges:[],charactersChanged:0};let a=n.findDiffEnd(r);if(!a)return{ranges:[],charactersChanged:0};let o=a.a,s=a.b;i>s&&(s=i),i>o&&(o=i);let c=s-i,l=o-i;if(c<=0)return{ranges:[],charactersChanged:0};let u=Math.max(0,i),d=Math.min(s,t.content.size);return u>=d?{ranges:[],charactersChanged:0}:{ranges:[{from:u,to:d}],charactersChanged:Math.max(c,l)}}var P=r.Extension.create({name:`aiExecute`,addOptions(){return{shortcut:`Mod-Enter`,getProvider:()=>{throw Error(`AiExecute: getProvider not configured`)},onExecutionStateChange:()=>{},onError:()=>{}}},addStorage(){return{abortController:null,onExecutionStateChange:null,onError:null}},addKeyboardShortcuts(){let e=e=>{(this.storage.onExecutionStateChange??this.options.onExecutionStateChange)(e)},t=(e,t)=>{(this.storage.onError??this.options.onError)(e,t)};return{[this.options.shortcut]:({editor:n})=>{if(this.storage.abortController)return!0;let r=!1;if(n.state.doc.descendants(e=>{if(e.type.name===`aiDirective`)return r=!0,!1}),!r)return!1;let i=n.storage.markdown.getMarkdown(),a=n.state.doc,o=new AbortController;this.storage.abortController=o;let s=Date.now();n.setEditable(!1,!1),e(!0);let c=this.options.getProvider(),l=j()+`

---

`+i;return c.execute(l,o.signal).then(e=>{if(!n.isDestroyed){if(typeof e!=`string`){let e=Error(`AI returned invalid response`);n.setEditable(!0,!1),n.view.dom.dispatchEvent(new CustomEvent(`ai-error`,{bubbles:!0,composed:!0,detail:{error:e,type:`parse`}})),t(e,`parse`);return}if(e.trim()===``){let e=`empty-response`,r=Error(`AI returned an empty response`);n.setEditable(!0,!1),n.view.dom.dispatchEvent(new CustomEvent(`ai-error`,{bubbles:!0,composed:!0,detail:{error:r,type:e}})),t(r,e);return}try{let t=M(n,e),{ranges:r,charactersChanged:i}=N(a,t),o=(0,m.closeHistory)(n.state.tr.replaceWith(0,n.state.doc.content.size,t.content));o.setMeta(`aiReplacement`,!0),n.view.dispatch(o);let c=n.schema.marks.aiHighlight;if(c&&r.length>0){let e=n.state.tr;for(let t of r)e.addMark(t.from,t.to,c.create());e.setMeta(`aiReplacement`,!0),e.setMeta(`addToHistory`,!1),n.view.dispatch(e)}n.view.dispatch((0,m.closeHistory)(n.state.tr).setMeta(`aiReplacement`,!0));let l=Date.now()-s;n.view.dom.dispatchEvent(new CustomEvent(`ai-completed`,{bubbles:!0,composed:!0,detail:{duration:l,charactersChanged:i}})),n.setEditable(!0,!1)}catch(e){n.setEditable(!0,!1);let r=e instanceof Error?e:Error(String(e));n.view.dom.dispatchEvent(new CustomEvent(`ai-error`,{bubbles:!0,composed:!0,detail:{error:r,type:`parse`}})),t(r,`parse`)}}}).catch(e=>{if(e?.name!==`AbortError`&&(console.error(`AiExecute error:`,e),!n.isDestroyed)){n.setEditable(!0,!1);let r=e instanceof Error?e:Error(String(e));n.view.dom.dispatchEvent(new CustomEvent(`ai-error`,{bubbles:!0,composed:!0,detail:{error:r,type:`provider`}})),t(r,`provider`)}}).finally(()=>{this.storage.abortController===o&&(this.storage.abortController=null,e(!1))}),!0}}},addProseMirrorPlugins(){let e=this,t=t=>{(e.storage.onExecutionStateChange??e.options.onExecutionStateChange)(t)};return[new p.Plugin({props:{handleDOMEvents:{keydown(n,r){return r.key===`Escape`&&e.storage.abortController&&!e.storage.abortController.signal.aborted?(e.storage.abortController.abort(),e.storage.abortController=null,e.editor.isDestroyed||e.editor.setEditable(!0,!1),t(!1),r.preventDefault(),!0):!1}}}})]}}),F=S(((e,t)=>{t.exports=function(e){return e.map(function(e){return e===``?`''`:e&&typeof e==`object`?e.op.replace(/(.)/g,`\\$1`):/["\s\\]/.test(e)&&!/'/.test(e)?`'`+e.replace(/(['])/g,`\\$1`)+`'`:/["'\s]/.test(e)?`"`+e.replace(/(["\\$`!])/g,`\\$1`)+`"`:String(e).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g,`$1\\$2`)}).join(` `)}})),I=S(((e,t)=>{for(var n=`(?:`+[`\\|\\|`,`\\&\\&`,`;;`,`\\|\\&`,`\\<\\(`,`\\<\\<\\<`,`>>`,`>\\&`,`<\\&`,`[&;()|<>]`].join(`|`)+`)`,r=RegExp(`^`+n+`$`),i=`|&;()<> \\t`,a=`"((\\\\"|[^"])*?)"`,o=`'((\\\\'|[^'])*?)'`,s=/^#$/,c=`'`,l=`"`,u=`$`,d=``,f=4294967296,p=0;p<4;p++)d+=(f*Math.random()).toString(16);var m=RegExp(`^`+d);function h(e,t){for(var n=t.lastIndex,r=[],i;i=t.exec(e);)r.push(i),t.lastIndex===i.index&&(t.lastIndex+=1);return t.lastIndex=n,r}function g(e,t,n){var r=typeof e==`function`?e(n):e[n];return r===void 0&&n!=``?r=``:r===void 0&&(r=`$`),typeof r==`object`?t+d+JSON.stringify(r)+d:t+r}function _(e,t,d){d||={};var f=d.escape||`\\`,p=`(\\`+f+`['"`+i+`]|[^\\s'"`+i+`])+`,m=h(e,new RegExp([`(`+n+`)`,`(`+p+`|`+a+`|`+o+`)+`].join(`|`),`g`));if(m.length===0)return[];t||={};var _=!1;return m.map(function(n){var i=n[0];if(!i||_)return;if(r.test(i))return{op:i};var a=!1,o=!1,d=``,p=!1,m;function h(){m+=1;var e,n,r=i.charAt(m);if(r===`{`){if(m+=1,i.charAt(m)===`}`)throw Error(`Bad substitution: `+i.slice(m-2,m+1));if(e=i.indexOf(`}`,m),e<0)throw Error(`Bad substitution: `+i.slice(m));n=i.slice(m,e),m=e}else if(/[*@#?$!_-]/.test(r))n=r,m+=1;else{var a=i.slice(m);e=a.match(/[^\w\d_]/),e?(n=a.slice(0,e.index),m+=e.index-1):(n=a,m=i.length)}return g(t,``,n)}for(m=0;m<i.length;m++){var v=i.charAt(m);if(p||=!a&&(v===`*`||v===`?`),o)d+=v,o=!1;else if(a)v===a?a=!1:a==c?d+=v:v===f?(m+=1,v=i.charAt(m),v===l||v===f||v===u?d+=v:d+=f+v):v===u?d+=h():d+=v;else if(v===l||v===c)a=v;else if(r.test(v))return{op:i};else if(s.test(v)){_=!0;var y={comment:e.slice(n.index+m+1)};return d.length?[d,y]:[y]}else v===f?o=!0:v===u?d+=h():d+=v}return p?{op:`glob`,pattern:d}:d}).reduce(function(e,t){return t===void 0?e:e.concat(t)},[])}t.exports=function(e,t,n){var r=_(e,t,n);return typeof t==`function`?r.reduce(function(e,t){if(typeof t==`object`)return e.concat(t);var n=t.split(RegExp(`(`+d+`.*?`+d+`)`,`g`));return n.length===1?e.concat(n[0]):e.concat(n.filter(Boolean).map(function(e){return m.test(e)?JSON.parse(e.split(d)[1]):e}))},[]):r}})),L=S((e=>{e.quote=F(),e.parse=I()})),R=S(((e,t)=>{t.exports={}})),z=L(),B=class{constructor(e){if(!e.cliCommand)throw Error(`CLI provider requires a cliCommand`);this.command=e.cliCommand}async execute(e,t){if(t?.aborted)throw Error(`Aborted`);let n;try{n=(await Promise.resolve().then(()=>w(R(),1))).spawn}catch{throw Error(`CLI provider requires Node.js/Electron environment (child_process not available)`)}let r=(0,z.parse)(this.command);if(r.some(e=>typeof e!=`string`))throw Error(`CLI command contains shell operators (&&, |, ;, etc.) which are not supported. Use a wrapper script instead.`);let[i,...a]=r;return new Promise((r,o)=>{let s=n(i,a,{stdio:[`pipe`,`pipe`,`pipe`]}),c=!1,l=e=>{c||(c=!0,r(e))},u=e=>{c||(c=!0,o(e))},d=()=>{t&&t.removeEventListener(`abort`,f)},f=()=>{s.kill(),u(Error(`Aborted`)),d()},p=[],m=[];s.stdout.on(`data`,e=>{p.push(e)}),s.stderr.on(`data`,e=>{m.push(e)}),s.on(`error`,e=>{u(e),d()}),s.on(`close`,e=>{if(e===0)l(Buffer.concat(p).toString());else{let t=Buffer.concat(m).toString();u(Error(`CLI command exited with code ${e}: ${t}`))}d()}),t&&t.addEventListener(`abort`,f),s.stdin.write(e),s.stdin.end()})}},V=class{constructor(e){if(!e.endpoint)throw Error(`Proxy provider requires an endpoint`);if(this.endpoint=e.endpoint,this.headers={"Content-Type":`application/json`},e.proxyHeaders){let t=JSON.parse(e.proxyHeaders);Object.assign(this.headers,t)}}async execute(e,t){let n=await fetch(this.endpoint,{method:`POST`,headers:this.headers,body:JSON.stringify({document:e,format:`markdown`}),signal:t});if(!n.ok)throw Error(`Proxy request failed: ${n.status} ${n.statusText}`);let r=await n.json();if(typeof r.document!=`string`)throw Error(`Invalid proxy response: missing or non-string "document" field`);return r.document}};function H(e){if(!e.provider)throw Error(`ai-provider attribute is required`);switch(e.provider){case`cli`:return new B(e);case`proxy`:return new V(e);default:throw Error(`Unknown AI provider: ${e.provider}`)}}function U(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a}var W=r.Extension.create({name:`linkShortcut`,addKeyboardShortcuts(){return{"Mod-k":({editor:e})=>{let{from:t,to:n}=e.state.selection;if(e.isActive(`link`)&&t===n){let t=e.getAttributes(`link`).href??``,n=window.prompt(`Edit URL (clear to remove):`,t);return n===null||(n===``?e.chain().focus().extendMarkRange(`link`).unsetLink().run():e.chain().focus().extendMarkRange(`link`).setLink({href:n}).run()),!0}let r=window.prompt(`Enter URL:`);return r===null||r===``||e.chain().focus().setLink({href:r}).run(),!0}}}}),G=class extends t.LitElement{constructor(...e){super(...e),this.content=``,this.aiShortcut=``,this.aiExecuteShortcut=``,this.aiProviderName=``,this.aiEndpoint=``,this.aiCliCommand=``,this.aiProxyHeaders=``,this._errorMessage=null,this._showSuccess=!1,this._editor=null,this._updatingFromEditor=!1,this._aiProvider=null,this._cachedProvider=null,this._errorToastTimer=null,this._successTimer=null,this._boundEscapeHandler=this._handleEscapeCancel.bind(this)}static{this.styles=t.css`
    :host {
      color-scheme: light dark;
      --md-compleat-font-family: system-ui, -apple-system, sans-serif;
      --md-compleat-font-mono: ui-monospace, 'SFMono-Regular', 'SF Mono',
        Menlo, Consolas, monospace;
      --md-compleat-max-width: 65ch;
      --md-compleat-max-height: none;
      --md-compleat-focus-outline: 2px solid highlight;
      --md-compleat-code-bg: light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.08));
      --md-compleat-blockquote-border: 3px solid light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2));
      --md-compleat-hr-color: light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15));
      --md-compleat-table-border: 1px solid light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15));
      --md-compleat-link-color: light-dark(#1a6be0, #5b9cf0);
      --md-compleat-ai-highlight: light-dark(rgba(74, 144, 226, 0.15), rgba(74, 144, 226, 0.25));
      --md-compleat-ai-chip-bg: light-dark(#f0e6ff, #2d1f4e);
      --md-compleat-ai-chip-border: #7c3aed;
      --_muted: light-dark(rgba(0, 0, 0, 0.4), rgba(255, 255, 255, 0.4));
      --_muted-strong: light-dark(rgba(0, 0, 0, 0.65), rgba(255, 255, 255, 0.65));
      --_muted-hover: light-dark(rgba(0, 0, 0, 0.7), rgba(255, 255, 255, 0.7));
      --_surface: light-dark(#fff, #1e1e1e);
      --_surface-hover: light-dark(#f0e6ff, #2d1f4e);
      --_border: light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15));
      --_shadow: light-dark(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.4));
      --_success: light-dark(#16a34a, #4ade80);
      display: block;
    }

    :host(:focus-within) {
      outline: var(--md-compleat-focus-outline);
      outline-offset: -1px;
      border-radius: 2px;
    }

    .editor {
      position: relative;
      font-family: var(--md-compleat-font-family);
      padding: 1rem;
      max-width: var(--md-compleat-max-width);
      max-height: var(--md-compleat-max-height);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .ProseMirror {
      outline: none;
    }

    .ProseMirror p {
      margin: 0.5em 0;
    }

    .ProseMirror > :first-child {
      margin-top: 0;
    }

    /* Headings */
    .ProseMirror h1 {
      font-size: 2em;
      font-weight: 700;
      margin: 0.8em 0 0.4em;
      line-height: 1.2;
    }

    .ProseMirror h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.7em 0 0.35em;
      line-height: 1.25;
    }

    .ProseMirror h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 0.6em 0 0.3em;
      line-height: 1.3;
    }

    .ProseMirror h4,
    .ProseMirror h5,
    .ProseMirror h6 {
      font-size: 1em;
      font-weight: 600;
      margin: 0.5em 0 0.25em;
    }

    /* Code blocks */
    .ProseMirror pre {
      background: var(--md-compleat-code-bg);
      border-radius: 4px;
      padding: 0.75em 1em;
      overflow-x: auto;
      margin: 0.75em 0;
    }

    .ProseMirror pre > code {
      font-family: var(--md-compleat-font-mono);
      font-size: 0.9em;
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* Inline code */
    .ProseMirror :not(pre) > code {
      font-family: var(--md-compleat-font-mono);
      font-size: 0.9em;
      background: var(--md-compleat-code-bg);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }

    /* Blockquotes */
    .ProseMirror blockquote {
      border-left: var(--md-compleat-blockquote-border);
      margin: 0.75em 0;
      padding-left: 1em;
      color: var(--_muted-strong);
    }

    /* Lists */
    .ProseMirror ul,
    .ProseMirror ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }

    .ProseMirror li {
      margin: 0.2em 0;
    }

    /* Tables */
    .ProseMirror table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.75em 0;
    }

    .ProseMirror th,
    .ProseMirror td {
      border: var(--md-compleat-table-border);
      padding: 0.4em 0.6em;
      text-align: left;
    }

    .ProseMirror th {
      font-weight: 600;
      background: var(--md-compleat-code-bg);
    }

    /* Horizontal rules */
    .ProseMirror hr {
      border: none;
      border-top: 2px solid var(--md-compleat-hr-color);
      margin: 1.5em 0;
    }

    /* Links */
    .ProseMirror a {
      color: var(--md-compleat-link-color);
      text-decoration: underline;
      cursor: pointer;
    }

    /* Images */
    .ProseMirror img {
      max-width: 100%;
      height: auto;
    }

    /* AI highlight marks */
    mark[data-ai-highlight] {
      background: var(--md-compleat-ai-highlight, rgba(74, 144, 226, 0.15));
      transition: background 0.3s ease;
    }

    /* AI directive chips */
    .ai-chip {
      display: flex;
      align-items: center;
      background: var(--md-compleat-ai-chip-bg, #f0e6ff);
      border-left: 3px solid var(--md-compleat-ai-chip-border, #7c3aed);
      border-radius: 4px;
      padding: 0.5em 0.75em;
      margin: 0.5em 0;
      cursor: pointer;
    }

    .ai-chip__icon {
      color: var(--_muted);
      margin-right: 0.5em;
      flex-shrink: 0;
    }

    .ai-chip__instruction {
      font-family: var(--md-compleat-font-mono);
      flex: 1;
      word-break: break-word;
    }

    .ai-chip__toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 0.25em;
      margin-right: 0.25em;
      font-size: 1em;
      color: var(--_muted);
      flex-shrink: 0;
    }

    .ai-chip__toggle:hover {
      color: var(--_muted-hover);
    }

    .ai-suggestion {
      position: absolute;
      background: var(--_surface);
      border: 1px solid var(--_border);
      border-radius: 4px;
      box-shadow: 0 2px 8px var(--_shadow);
      padding: 0.5em 0.75em;
      cursor: pointer;
      z-index: 10;
      font-family: var(--md-compleat-font-family);
      font-size: 0.9em;
    }

    .ai-suggestion:hover {
      background: var(--_surface-hover);
    }

    /* AI execution state */
    .editor.ai-executing {
      overflow: hidden;
      cursor: wait;
    }

    .editor.ai-executing .ProseMirror {
      cursor: wait;
    }

    .editor.ai-executing::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--md-compleat-ai-chip-border, #7c3aed);
      animation: md-compleat-progress 1.5s ease-in-out infinite;
      z-index: 10;
    }

    .editor.ai-executing::after {
      content: 'Press Esc to cancel';
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 0.75em;
      color: var(--_muted);
      z-index: 10;
    }

    @keyframes md-compleat-progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .editor.ai-executing .ai-chip {
      animation: md-compleat-pulse 2s ease-in-out infinite;
    }

    @keyframes md-compleat-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
      50% { box-shadow: 0 0 8px 2px rgba(124, 58, 237, 0.3); }
    }

    .ai-error-toast {
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: #d32f2f;
      color: #fff;
      padding: 0.5em 1em;
      border-radius: 4px;
      font-size: 0.85em;
      z-index: 20;
      animation: md-compleat-toast-in 0.2s ease-out;
    }

    @keyframes md-compleat-toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes md-compleat-success-toast-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .editor.ai-completing::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--md-compleat-ai-chip-border, #7c3aed);
      animation: md-compleat-progress-complete 0.3s ease-out forwards;
      z-index: 10;
    }

    @keyframes md-compleat-progress-complete {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .ai-success-toast {
      position: absolute;
      top: 6px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75em;
      color: var(--_muted-strong);
      z-index: 20;
      animation: md-compleat-success-toast-in 0.2s ease-out;
    }

    .ai-success-toast svg {
      width: 14px;
      height: 14px;
      color: var(--_success);
    }

  `}set aiProvider(e){this._aiProvider=e,this.requestUpdate()}get aiProvider(){return this._aiProvider}getActiveProvider(){return this._aiProvider?this._aiProvider:(this._cachedProvider||=H({provider:this.aiProviderName,endpoint:this.aiEndpoint,cliCommand:this.aiCliCommand,proxyHeaders:this.aiProxyHeaders}),this._cachedProvider)}render(){return t.html`<div class="editor"></div>${this._errorMessage?t.html`<div class="ai-error-toast">${this._errorMessage}</div>`:``}${this._showSuccess?t.html`<div class="ai-success-toast"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`:``}`}firstUpdated(){this._initEditor()}updated(e){[`aiProviderName`,`aiEndpoint`,`aiCliCommand`,`aiProxyHeaders`].some(t=>e.has(t))&&(this._cachedProvider=null),e.has(`content`)&&this._editor&&(this._updatingFromEditor?this._updatingFromEditor=!1:this._editor.commands.setContent(this.content,{emitUpdate:!1}))}connectedCallback(){super.connectedCallback(),this.style.display||(this.style.display=`block`),this.hasUpdated&&!this._editor&&this._initEditor()}disconnectedCallback(){super.disconnectedCallback(),this._errorToastTimer&&=(clearTimeout(this._errorToastTimer),null),this._successTimer&&=(clearTimeout(this._successTimer),null),document.removeEventListener(`keydown`,this._boundEscapeHandler),(this._editor?.storage)?.aiExecute?.abortController?.abort(),this.renderRoot.querySelector(`.editor`)?.classList.remove(`ai-executing`),this._editor?.destroy(),this._editor=null}_handleEscapeCancel(e){if(e.key!==`Escape`||!this._editor)return;let t=this._editor.storage.aiExecute;t?.abortController&&!t.abortController.signal.aborted&&(t.abortController.abort(),t.abortController=null,this._editor.setEditable(!0,!1),this.renderRoot.querySelector(`.editor`)?.classList.remove(`ai-executing`),e.preventDefault())}getMarkdown(){return this._editor?this._editor.storage.markdown.getMarkdown():``}_showCompletionSequence(e){e.classList.add(`ai-completing`),setTimeout(()=>{e.classList.remove(`ai-completing`),this._showSuccess=!0,this._successTimer=setTimeout(()=>{this._showSuccess=!1,this._successTimer=null},2e3)},300)}_initEditor(){let e=this.renderRoot.querySelector(`.editor`);e&&(this._editor=new r.Editor({element:e,extensions:[i.default,a.Markdown.configure({html:!1,tightLists:!0}),o.default,s.default.configure({openOnClick:!1,HTMLAttributes:{rel:`noopener noreferrer`}}),W,c.Table,l.default,u.default,d.default,D.configure({...this.aiShortcut?{shortcut:this.aiShortcut}:{}}),O,A,P.configure({...this.aiExecuteShortcut?{shortcut:this.aiExecuteShortcut}:{},getProvider:()=>this.getActiveProvider(),onExecutionStateChange:t=>{e.classList.toggle(`ai-executing`,t),t?(this._showSuccess=!1,document.addEventListener(`keydown`,this._boundEscapeHandler)):document.removeEventListener(`keydown`,this._boundEscapeHandler)},onError:e=>{this._errorToastTimer&&clearTimeout(this._errorToastTimer),this._errorMessage=e.message,this._errorToastTimer=setTimeout(()=>{this._errorMessage=null,this._errorToastTimer=null},5e3)}})],content:this.content,injectCSS:!1,onUpdate:({editor:e})=>{let t=e.storage.markdown.getMarkdown();this._updatingFromEditor=!0,this.content=t,this.dispatchEvent(new CustomEvent(`content-changed`,{detail:{content:t},bubbles:!0,composed:!0}))}}),this._editor.view.dom.addEventListener(`ai-completed`,()=>{this._showCompletionSequence(e)}))}};U([(0,n.property)({type:String})],G.prototype,`content`,void 0),U([(0,n.property)({type:String,attribute:`ai-shortcut`})],G.prototype,`aiShortcut`,void 0),U([(0,n.property)({type:String,attribute:`ai-execute-shortcut`})],G.prototype,`aiExecuteShortcut`,void 0),U([(0,n.property)({type:String,attribute:`ai-provider`})],G.prototype,`aiProviderName`,void 0),U([(0,n.property)({type:String,attribute:`ai-endpoint`})],G.prototype,`aiEndpoint`,void 0),U([(0,n.property)({type:String,attribute:`ai-cli-command`})],G.prototype,`aiCliCommand`,void 0),U([(0,n.property)({type:String,attribute:`ai-proxy-headers`})],G.prototype,`aiProxyHeaders`,void 0),U([(0,n.state)()],G.prototype,`_errorMessage`,void 0),U([(0,n.state)()],G.prototype,`_showSuccess`,void 0),G=U([(0,n.customElement)(`md-compleat`)],G),Object.defineProperty(e,`MdCompleat`,{enumerable:!0,get:function(){return G}}),e.VERSION=`0.0.1`,e.createProvider=H});