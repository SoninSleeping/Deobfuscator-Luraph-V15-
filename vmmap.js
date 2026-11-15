// core/vmmap.js
// Hooking com consciência de atributos (VM type por closure).

const { parseAttributes } = require('./attributes');

// Preenchido pelo loader real do projeto original.
// Aqui mantemos um objeto vazio como fallback; substitua pelo mapa real.
const OPAL_DISPATCH = {};

function hookClosures(ast, hooks) {
    const functionAttrs = new Map();

    function annotate(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
            // LPH_ATTRIBUTES(...) é a primeira statement do CORPO da função
            // protegida, não uma linha do bloco que a contém. A versão
            // original lia parentBody (o bloco vizinho) e por isso nunca
            // batia com os atributos reais.
            const attrs = parseAttributes(node.body || []);
            functionAttrs.set(node, attrs);
        }
        for (const k of Object.keys(node)) {
            const v = node[k];
            if (Array.isArray(v)) v.forEach(annotate);
            else if (v && typeof v === 'object') annotate(v);
        }
    }
    annotate(ast);

    functionAttrs.forEach((attrs, fnNode) => {
        if (attrs.vm === 'NONE') return;
        hooks.register(fnNode, attrs.vm);
    });

    return functionAttrs;
}

module.exports = { hookClosures, OPAL_DISPATCH };
