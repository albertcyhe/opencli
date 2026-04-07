/**
 * Shared reply helpers for UI-based comment reply across platforms.
 *
 * Provides reusable JS generators for:
 * - Fuzzy comment matching (by ID, text, author)
 * - Rich text insertion (execCommand, paste, native setter)
 * - Button finding within a composer root
 */

/**
 * Generate JS to find a comment element by fuzzy matching.
 *
 * Priority: 1) exact ID in attributes, 2) text content match, 3) author+time match.
 * Returns the matching DOM element or null.
 */
export function findCommentJs(opts: {
  containerSelector: string;
  commentId: string;
  text?: string;
  author?: string;
}): string {
  return `
    (() => {
      var containers = document.querySelectorAll(${JSON.stringify(opts.containerSelector)});
      var commentId = ${JSON.stringify(opts.commentId)};
      var matchText = ${JSON.stringify(opts.text || '')};
      var matchAuthor = ${JSON.stringify(opts.author || '')};

      // Strategy 1: exact ID match in attributes
      for (var i = 0; i < containers.length; i++) {
        var el = containers[i];
        var toCheck = [el].concat(Array.from(el.querySelectorAll('*')).slice(0, 50));
        for (var j = 0; j < toCheck.length; j++) {
          var attrs = Array.from(toCheck[j].attributes || []);
          for (var k = 0; k < attrs.length; k++) {
            if (String(attrs[k].value).includes(commentId)) {
              return { found: true, index: i, method: 'id' };
            }
          }
        }
      }

      // Strategy 2: text content fuzzy match
      if (matchText && matchText.length > 5) {
        var needle = matchText.substring(0, 80).toLowerCase();
        for (var i = 0; i < containers.length; i++) {
          var text = (containers[i].innerText || '').toLowerCase();
          if (text.includes(needle)) {
            return { found: true, index: i, method: 'text' };
          }
        }
      }

      // Strategy 3: author name match
      if (matchAuthor && matchAuthor.length > 1) {
        var authorNeedle = matchAuthor.toLowerCase();
        for (var i = 0; i < containers.length; i++) {
          var text = (containers[i].innerText || '').toLowerCase();
          if (text.includes(authorNeedle)) {
            return { found: true, index: i, method: 'author' };
          }
        }
      }

      return { found: false, total: containers.length };
    })()
  `;
}

/**
 * Generate JS to insert text into a rich text editor (contenteditable / textarea).
 *
 * Tries 3 strategies in order:
 * 1. execCommand('insertText') — works with Draft.js, contenteditable
 * 2. ClipboardEvent paste — fallback for editors that block execCommand
 * 3. Native value setter — for standard input/textarea
 */
export function insertTextJs(inputSelector: string, text: string): string {
  return `
    (() => {
      var input = ${inputSelector};
      if (!input) return { ok: false, error: 'Input element not found' };

      input.focus();
      var textToInsert = ${JSON.stringify(text)};

      // Strategy 1: execCommand (most compatible with rich editors)
      if (document.execCommand('insertText', false, textToInsert)) {
        return { ok: true, method: 'execCommand' };
      }

      // Strategy 2: ClipboardEvent paste (Draft.js fallback)
      try {
        var dt = new DataTransfer();
        dt.setData('text/plain', textToInsert);
        input.dispatchEvent(new ClipboardEvent('paste', {
          clipboardData: dt, bubbles: true, cancelable: true
        }));
        return { ok: true, method: 'paste' };
      } catch(e) {}

      // Strategy 3: Native value setter (standard input/textarea)
      try {
        var nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype, 'value'
        )?.set || Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(input, textToInsert);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true, method: 'nativeSetter' };
        }
      } catch(e) {}

      return { ok: false, error: 'All text insertion methods failed' };
    })()
  `;
}

/**
 * Generate JS to find and click a submit button within a container.
 *
 * Searches ONLY within the specified container (composer root) to avoid
 * clicking wrong buttons elsewhere on the page.
 */
export function findAndClickButtonJs(containerSelector: string, patterns: string[]): string {
  const patternsJson = JSON.stringify(patterns);
  return `
    (() => {
      var root = ${containerSelector};
      if (!root) return { ok: false, error: 'Container not found' };

      var patterns = ${patternsJson};
      var btns = Array.from(root.querySelectorAll('button, [role="button"]'));

      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        if (b.disabled) continue;
        var t = (b.textContent || '').trim().toLowerCase();
        var label = (b.getAttribute('aria-label') || '').toLowerCase();
        var testId = b.getAttribute('data-e2e') || b.getAttribute('data-testid') || '';

        for (var p = 0; p < patterns.length; p++) {
          var pat = patterns[p].toLowerCase();
          if (t === pat || label.includes(pat) || testId.includes(pat)) {
            b.click();
            return { ok: true, matched: patterns[p], text: t };
          }
        }
      }

      return { ok: false, error: 'No matching button found', buttonCount: btns.length };
    })()
  `;
}
