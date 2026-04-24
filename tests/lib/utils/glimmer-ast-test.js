'use strict';

const { isEmptyNode } = require('../../../lib/utils/glimmer-ast');

describe('isEmptyNode', () => {
  it('returns true for GlimmerMustacheCommentStatement', () => {
    expect(isEmptyNode({ type: 'GlimmerMustacheCommentStatement' })).toBe(true);
  });

  it('returns true for GlimmerCommentStatement', () => {
    expect(isEmptyNode({ type: 'GlimmerCommentStatement' })).toBe(true);
  });

  it('returns true for whitespace-only GlimmerTextNode', () => {
    expect(isEmptyNode({ type: 'GlimmerTextNode', chars: '   \n  ' })).toBe(true);
  });

  it('returns false for GlimmerTextNode with visible characters', () => {
    expect(isEmptyNode({ type: 'GlimmerTextNode', chars: '  hello  ' })).toBe(false);
  });

  it('returns false for GlimmerMustacheStatement', () => {
    expect(isEmptyNode({ type: 'GlimmerMustacheStatement' })).toBe(false);
  });

  it('returns false for GlimmerElementNode', () => {
    expect(isEmptyNode({ type: 'GlimmerElementNode' })).toBe(false);
  });
});
