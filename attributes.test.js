const test = require('node:test');
const assert = require('node:assert/strict');
const luaparse = require('luaparse');
const { parseAttributes, collectPrechecks } = require('../core/attributes');

test('parseAttributes lê VM(...) de uma função com LPH_ATTRIBUTES como primeira linha', () => {
    const src = `
        local function f()
            LPH_ATTRIBUTES({VM("ONYX")})
        end
    `;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const fn = ast.body[0];
    const attrs = parseAttributes(fn.body);
    assert.equal(attrs.vm, 'ONYX');
});

test('parseAttributes lê PRESET e TRANSFORM junto com VM(NONE)', () => {
    const src = `
        local function f()
            LPH_ATTRIBUTES({VM("NONE"), PRESET("max"), TRANSFORM("CONTROL_FLOW", "EXTRACT")})
        end
    `;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const attrs = parseAttributes(ast.body[0].body);
    assert.equal(attrs.vm, 'NONE');
    assert.equal(attrs.preset, 'max');
    assert.deepEqual(attrs.transforms, ['CONTROL_FLOW', 'EXTRACT']);
});

test('parseAttributes volta ao default OPAL quando não há LPH_ATTRIBUTES', () => {
    const src = `local function f() return 1 end`;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const attrs = parseAttributes(ast.body[0].body);
    assert.equal(attrs.vm, 'OPAL');
});

test('collectPrechecks extrai o valor esperado e marca a função anônima', () => {
    const src = `
        LPH_PRECHECK(function() return true end, 12345)
    `;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const prechecks = collectPrechecks(ast);
    assert.equal(prechecks.length, 1);
    assert.equal(prechecks[0].expected, 12345);
    assert.ok(prechecks[0].fnSource, 'fnSource deveria capturar a função anônima');
});

test('collectPrechecks não duplica o mesmo LPH_PRECHECK ao varrer a árvore', () => {
    const src = `LPH_PRECHECK(function() end, 1)`;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const prechecks = collectPrechecks(ast);
    assert.equal(prechecks.length, 1);
});
