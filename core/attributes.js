// core/attributes.js
// Extrai LPH_ATTRIBUTES, LPH_PRECHECK e diretivas do AST antes do hooking.
// O source protegido NÃO virtualiza essas diretivas: são metadados de compilação.

const VM_TYPES = new Set(['OPAL', 'ONYX', 'NONE']);

function extractLiteral(node) {
    if (!node) return null;
    if (node.type === 'NumberLiteral') return node.value;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'BooleanLiteral') return node.value;
    if (node.type === 'TableConstructorExpression') {
        return node.fields
            .filter(f => f.type === 'TableValue')
            .map(f => extractLiteral(f.value));
    }
    return null;
}

function parseCall(node, name) {
    if (!node || node.type !== 'CallExpression') return null;
    const callee = node.base;
    if (!callee || callee.type !== 'Identifier' || callee.name !== name) return null;
    return node.arguments || [];
}

function parseAttributes(body) {
    const result = { vm: 'OPAL', preset: null, transforms: [] };
    const first = body[0];
    if (!first) return result;

    const attrs = parseCall(first, 'LPH_ATTRIBUTES');
    if (attrs) {
        for (const arg of attrs) {
            const vmCall = parseCall(arg, 'VM');
            if (vmCall && vmCall[0]) {
                const v = extractLiteral(vmCall[0]);
                if (VM_TYPES.has(v)) result.vm = v;
            }
            const presetCall = parseCall(arg, 'PRESET');
            if (presetCall && presetCall[0]) {
                result.preset = extractLiteral(presetCall[0]);
            }
            const transformCall = parseCall(arg, 'TRANSFORM');
            if (transformCall) {
                result.transforms = transformCall
                    .map(extractLiteral)
                    .filter(Boolean);
            }
        }
    }
    return result;
}

function collectPrechecks(ast) {
    const prechecks = [];
    function walk(node) {
        if (!node || typeof node !== 'object') return;
        const args = parseCall(node, 'LPH_PRECHECK');
        if (args && args.length >= 2) {
            const expected = extractLiteral(args[1]);
            if (expected !== null) {
                prechecks.push({
                    expected,
                    fnSource: args[0]?.type === 'FunctionExpression' ? args[0] : null,
                });
            }
        }
        for (const k of Object.keys(node)) {
            const v = node[k];
            if (Array.isArray(v)) v.forEach(walk);
            else if (v && typeof v === 'object') walk(v);
        }
    }
    walk(ast);
    return prechecks;
}

module.exports = { parseAttributes, collectPrechecks, extractLiteral };
