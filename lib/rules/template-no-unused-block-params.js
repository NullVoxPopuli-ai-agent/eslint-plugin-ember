function collectChildNodes(n) {
  const children = [];
  if (n.program) {
    children.push(n.program);
  }
  if (n.inverse) {
    children.push(n.inverse);
  }
  if (n.params) {
    children.push(...n.params);
  }
  if (n.hash?.pairs) {
    children.push(...n.hash.pairs.map((p) => p.value));
  }
  if (n.body) {
    children.push(...n.body);
  }
  if (n.path) {
    children.push(n.path);
  }
  if (n.attributes) {
    children.push(...n.attributes.map((a) => a.value));
  }
  if (n.children) {
    children.push(...n.children);
  }
  return children;
}

function markParamIfUsed(name, blockParams, usedParams, shadowedParams) {
  const firstPart = name.split('.')[0];
  if (blockParams.includes(firstPart) && !shadowedParams.has(firstPart)) {
    usedParams.add(firstPart);
  }
}

function isPartialStatement(n) {
  return (
    (n.type === 'GlimmerMustacheStatement' || n.type === 'GlimmerBlockStatement') &&
    n.path?.original === 'partial'
  );
}

function buildShadowedSet(shadowedParams, innerBlockParams, outerBlockParams) {
  const newShadowed = new Set(shadowedParams);
  for (const p of innerBlockParams) {
    if (outerBlockParams.includes(p)) {
      newShadowed.add(p);
    }
  }
  return newShadowed;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow unused block parameters in templates',
      category: 'Best Practices',
      url: 'https://github.com/ember-cli/eslint-plugin-ember/tree/master/docs/rules/template-no-unused-block-params.md',
      templateMode: 'both',
    },
    schema: [],
    messages: {
      unusedBlockParam: 'Block param "{{param}}" is unused',
    },
    originallyFrom: {
      name: 'ember-template-lint',
      rule: 'lib/rules/no-unused-block-params.js',
      docs: 'docs/rule/no-unused-block-params.md',
      tests: 'test/unit/rules/no-unused-block-params-test.js',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * In gjs/gts mode, ember-eslint-parser performs full scope analysis for
     * block params. Each block param becomes a Variable in a block scope, and
     * references are tracked automatically. This is more reliable than the
     * manual AST walk and correctly handles all edge cases.
     *
     * Returns the set of used param names via scope analysis, or null if
     * scope analysis is not available (hbs mode).
     */
    function getUsedParamsFromScope(node, blockParams) {
      if (!node.program) {
        return null;
      }

      let scope;
      try {
        scope = sourceCode.getScope(node.program);
      } catch {
        return null;
      }

      // Verify the scope has variables matching the block params.
      // In hbs mode the scope may not contain block param variables.
      const scopeVarNames = new Set(scope.variables.map((v) => v.name));
      const allParamsInScope = blockParams.every((p) => scopeVarNames.has(p));
      if (!allParamsInScope) {
        return null;
      }

      const usedParams = new Set();
      for (const variable of scope.variables) {
        if (blockParams.includes(variable.name) && variable.references.length > 0) {
          usedParams.add(variable.name);
        }
      }

      // {{partial}} implicitly uses all block params in scope.
      // Scope analysis cannot detect this, so check for partial statements
      // in the block body and mark all params as used if found.
      if (containsPartialStatement(node.program)) {
        for (const p of blockParams) {
          usedParams.add(p);
        }
      }

      return usedParams;
    }

    /**
     * Recursively checks whether a node tree contains a {{partial ...}} statement.
     */
    function containsPartialStatement(n) {
      if (!n) {
        return false;
      }
      if (isPartialStatement(n)) {
        return true;
      }
      for (const child of collectChildNodes(n)) {
        if (containsPartialStatement(child)) {
          return true;
        }
      }
      return false;
    }

    return {
      GlimmerBlockStatement(node) {
        const blockParams = node.program?.blockParams || [];
        if (blockParams.length === 0) {
          return;
        }

        // Try scope-based analysis first (gjs/gts mode)
        let usedParams = getUsedParamsFromScope(node, blockParams);

        // Fall back to manual AST walk (hbs mode)
        if (usedParams === null) {
          usedParams = new Set();

          function checkNode(n, shadowedParams) {
            if (!n) {
              return;
            }

            if (n.type === 'GlimmerPathExpression') {
              markParamIfUsed(n.original, blockParams, usedParams, shadowedParams);
            }

            if (n.type === 'GlimmerElementNode') {
              markParamIfUsed(n.tag, blockParams, usedParams, shadowedParams);
            }

            if (isPartialStatement(n)) {
              for (const p of blockParams) {
                if (!shadowedParams.has(p)) {
                  usedParams.add(p);
                }
              }
            }

            // When entering a nested block, add its blockParams to the shadowed set
            if (n.type === 'GlimmerBlockStatement' && n.program?.blockParams?.length > 0) {
              const newShadowed = buildShadowedSet(
                shadowedParams,
                n.program.blockParams,
                blockParams
              );
              checkBlockParts(
                n,
                blockParams,
                usedParams,
                shadowedParams,
                newShadowed,
                checkNode
              );
              return;
            }

            // Recursively check children
            for (const child of collectChildNodes(n)) {
              checkNode(child, shadowedParams);
            }
          }

          checkNode(node.program, new Set());
        }

        // Find the last index of a used param
        let lastUsedIndex = -1;
        for (let i = blockParams.length - 1; i >= 0; i--) {
          if (usedParams.has(blockParams[i])) {
            lastUsedIndex = i;
            break;
          }
        }

        // Only report trailing unused params (after the last used one)
        const unusedTrailing = blockParams.slice(lastUsedIndex + 1);

        if (unusedTrailing.length > 0) {
          context.report({
            node,
            messageId: 'unusedBlockParam',
            data: { param: unusedTrailing.join(', ') },
          });
        }
      },
    };
  },
};

function checkBlockParts(n, blockParams, usedParams, shadowedParams, newShadowed, checkNodeFn) {
  // Check the path/params of the block statement itself with current scope
  if (n.path) {
    checkNodeFn(n.path, shadowedParams);
  }
  if (n.params) {
    for (const param of n.params) {
      checkNodeFn(param, shadowedParams);
    }
  }
  if (n.hash?.pairs) {
    for (const pair of n.hash.pairs) {
      checkNodeFn(pair.value, shadowedParams);
    }
  }

  // Check the program body with the updated shadowed set
  if (n.program) {
    checkNodeFn(n.program, newShadowed);
  }
  if (n.inverse) {
    checkNodeFn(n.inverse, newShadowed);
  }
}
