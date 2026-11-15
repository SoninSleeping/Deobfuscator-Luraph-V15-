const test = require('node:test');
const assert = require('node:assert/strict');
const { getDispatchMap, loadOnyxMap } = require('../core/isa');

test('getDispatchMap("OPAL") devolve o mapa OPAL (hoje vazio, mas sempre um objeto)', () => {
    const map = getDispatchMap('OPAL');
    assert.equal(typeof map, 'object');
});

test('getDispatchMap("NONE") devolve null (structure.js cuida desse caso)', () => {
    assert.equal(getDispatchMap('NONE'), null);
});

test('getDispatchMap("ONYX") lança erro quando só existe o placeholder do repo (dispatch vazio)', () => {
    // O onyx_map.json versionado no repo é {"dispatch": {}}. Antes da
    // correção, qualquer objeto parseado do JSON era truthy e o erro
    // explícito prometido no README nunca disparava.
    assert.throws(() => getDispatchMap('ONYX'), /ONYX ISA map not loaded/);
});

test('getDispatchMap("ONYX") funciona depois de loadOnyxMap com um mapa real', () => {
    loadOnyxMap({ 1: 'MOVE', 2: 'LOADK' });
    const map = getDispatchMap('ONYX');
    assert.deepEqual(map, { 1: 'MOVE', 2: 'LOADK' });
});

test('getDispatchMap lança erro para um VM type desconhecido', () => {
    assert.throws(() => getDispatchMap('WUT'), /Unknown VM type/);
});
