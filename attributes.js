// core/attributes.js
// Extrai LPH_ATTRIBUTES, LPH_PRECHECK e diretivas do AST antes do hooking.
// O source protegido NÃO virtualiza essas diretivas: são metadados de compilação.

const VM_TYPES = new Set(['OPAL', 'ONYX', 'NONE']);

// luaparse nunca preenche StringLiteral.value (fica sempre null) — o texto
// só existe em .raw, com as aspas e os escapes originais. Isso foi
// confirmado rodando luaparse@0.3.1 diretamente; sem isso, todo VM(...),
// PRESET(...) e TRANSFORM(...) era lido como null.
function decodeLuaString(raw) {
    if (typeof raw !== 'string' || raw.length < 2) return raw;
    const quote = raw[0];
    if (quote === '"' || quote === "'") {
        const inner = raw.slice(1, -1);
        return inner.replace(/\\(.)/g, (_, ch) => {
            switch (ch) {
                case 'n': return '\n';
                case 't': return '\t';
                case 'r': return '\r';
                case 'a': return '\x07';
                case 'b': return '\b';
                case 'f': return '\f';
                case 'v': return '\v';
                default: return ch; // cobre \\, \", \' e qualquer outro escape literal
            }
        });
    }
    // long bracket string: [[...]] ou [=[...]=]
    const m = raw.match(/^\[(=*)\[([\s\S]*)\]\1\]$/);
    if (m) return m[2];
    return raw;
}

function extractLiteral(node) {
    if (!node) return null;
    if (node.type === 'NumericLiteral') return node.value;
    if (node.type === 'StringLiteral') return decodeLuaString(node.raw);
    if (node.type === 'BooleanLiteral') return node.value;
    if (node.type === 'TableConstructorExpression') {
        return node.fields
            .filter(f => f.type === 'TableValue')
            .map(f => extractLiteral(f.value));
    }
    return null;
}

// luaparse embrulha uma chamada usada como statement (ex: a primeira linha
// de uma função) em CallStatement { expression: CallExpression }. Usado só
// aqui, no acesso direto a body[0] — a varredura recursiva de
// collectPrechecks já alcança o CallExpression interno sozinha, então
// aplicar o mesmo unwrap dentro de parseCall causaria LPH_PRECHECK
// duplicado (uma vez no CallStatement, outra no CallExpression filho).
function asCallExpression(node) {
    if (!node) return null;
    if (node.type === 'CallExpression') return node;
    if (node.type === 'CallStatement' && node.expression) return node.expression;
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

    const attrs = parseCall(asCallExpression(first), 'LPH_ATTRIBUTES');
    // attrs é o array de ARGUMENTOS da chamada LPH_ATTRIBUTES({...}) — e
    // ela só recebe um argumento, a tabela. O bug (presente já no código
    // original) era iterar esse array de argumentos diretamente: isso
    // olhava para a TableConstructorExpression inteira como se fosse
    // VM(...)/PRESET(...)/TRANSFORM(...), nunca batia, e resultava sempre
    // no default 'OPAL' — o que passava despercebido porque esse é
    // justamente o valor mais comum. Precisa descer um nível e pegar os
    // campos (fields) da tabela.
    const entries = (attrs && attrs[0] && attrs[0].type === 'TableConstructorExpression')
        ? attrs[0].fields.filter(f => f.type === 'TableValue').map(f => f.value)
        : null;
    if (entries) {
        for (const arg of entries) {
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
                // luaparse tipa toda função, nomeada ou anônima, como
                // FunctionDeclaration (anônima vem com identifier: null);
                // "FunctionExpression" não existe nessa AST e nunca batia.
                prechecks.push({
                    expected,
                    fnSource: args[0] && args[0].type === 'FunctionDeclaration' ? args[0] : null,
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
