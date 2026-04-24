'use strict';

/**
 * A node that contributes no structural content to a template: whitespace-only
 * text, `{{! mustache comments }}`, and `<!-- HTML comments -->`.
 *
 * Rules that count "meaningful" children (e.g. "is this template just a
 * single yield?") must filter these out. `ember-eslint-parser` >= 0.11 keeps
 * comment nodes in their parent's `body`/`children` so that rules like
 * `template-no-html-comments` and the `{{! eslint-disable }}` inline-config
 * scanner can find them; structural rules need to skip them explicitly.
 */
function isEmptyNode(node) {
  return (
    node.type === 'GlimmerMustacheCommentStatement' ||
    node.type === 'GlimmerCommentStatement' ||
    (node.type === 'GlimmerTextNode' && !node.chars.trim())
  );
}

module.exports = {
  isEmptyNode,
};
