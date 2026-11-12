// core/structure.js
// Aplica transforms em funções VM(NONE).

const { liftTransformedFunction } = require('../src/transforms');

function structure(ast, functionAttrs) {
    functionAttrs.forEach((attrs, fnNode) => {
        fnNode.__attrs = attrs;
        if (attrs.vm === 'NONE' && attrs.transforms.length > 0) {
            liftTransformedFunction(fnNode, attrs.transforms);
        }
    });
    return ast;
}

module.exports = { structure };
