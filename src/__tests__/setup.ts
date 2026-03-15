import '../md-compleat.js';

// jsdom doesn't implement execCommand; stub it to prevent uncaught errors
// from prosemirror-view's Safari shadow selection workaround.
if (typeof document.execCommand !== 'function') {
  document.execCommand = () => false;
}
