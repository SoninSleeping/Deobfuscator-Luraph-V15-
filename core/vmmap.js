// core/vmmap.js
// Hooking com consciência de atributos (VM type por closure).

const { parseAttributes } = require('./attributes');

// Preenchido pelo loader real do projeto original.
// Aqui mantemos um objeto vazio como fallback; substitua pelo mapa real.
const OPAL_DISPATCH = {};

function hookClosures(ast, hooks) {
    const functionAttrs = new Map();

    function annotate(node, parentBody) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
            const attrs = parentBody ? parseAttributes(parentBody) : { vm: 'OPAL' };
            functionAttrs.set(node, attrs);
        }
        for (const k of Object.keys(node)) {
            const v = node[k];
            if (Array.isArray(v)) v.forEach(child => annotate(child, v));
            else if (v && typeof v === 'object') annotate(v, parentBody);
        }
    }
    annotate(ast, null);

    functionAttrs.forEach((attrs, fnNode) => {
        if (attrs.vm === 'NONE') return;
        hooks.register(fnNode, attrs.vm);
    });

    return functionAttrs;
}

module.exports = { hookClosures, OPAL_DISPATCH };
