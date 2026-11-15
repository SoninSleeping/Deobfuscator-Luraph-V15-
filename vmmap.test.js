const test = require('node:test');
const assert = require('node:assert/strict');
const luaparse = require('luaparse');
const { hookClosures } = require('../core/vmmap');

test('hookClosures associa VM(NONE) à própria função, não ao bloco vizinho', () => {
    const src = `
        local function outer()
            LPH_ATTRIBUTES({VM("OPAL")})
        end
        local function inner()
            LPH_ATTRIBUTES({VM("NONE")})
        end
    `;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const registered = [];
    const functionAttrs = hookClosures(ast, { register: (fn, vm) => registered.push(vm) });

    const vms = [...functionAttrs.values()].map(a => a.vm).sort();
    assert.deepEqual(vms, ['NONE', 'OPAL']);
    // register() não é chamado para VM(NONE)
    assert.deepEqual(registered.sort(), ['OPAL']);
});

test('hookClosures usa OPAL como default quando a função não declara LPH_ATTRIBUTES', () => {
    const src = `local function f() return 1 end`;
    const ast = luaparse.parse(src, { luaVersion: '5.1' });
    const functionAttrs = hookClosures(ast, { register: () => {} });
    const [attrs] = functionAttrs.values();
    assert.equal(attrs.vm, 'OPAL');
});
