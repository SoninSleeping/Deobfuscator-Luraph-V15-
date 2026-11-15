const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detect, processOne } = require('../deob.js');

test('detect() reconhece marcadores do Luraph v15', () => {
    assert.equal(detect('LPH_ATTRIBUTES({VM("OPAL")})'), 'luraph_v15');
});

test('detect() reconhece o padrão v14 quando não há marcadores v15', () => {
    assert.equal(detect('local init = (function() end)()'), 'luraph_v14');
});

test('detect() devolve unknown para Lua comum', () => {
    assert.equal(detect('local x = 1 + 1\nprint(x)'), 'unknown');
});

test('processOne não escreve saída e reporta erro quando a AST não dá parse', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deob-test-'));
    const input = path.join(dir, 'broken.lua');
    const output = path.join(dir, 'out.lua');
    fs.writeFileSync(input, 'local x = (((');

    const report = processOne(input, output, {});

    assert.ok(report.error, 'deveria reportar erro de parse');
    assert.equal(report.output, null);
    assert.equal(fs.existsSync(output), false, 'não deve fingir sucesso escrevendo saída');
});

test('processOne processa a fixture sample/amostra.lua e reporta prechecks/attrs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deob-test-'));
    const output = path.join(dir, 'out.lua');
    const sample = path.join(__dirname, '..', 'sample', 'amostra.lua');

    const report = processOne(sample, output, {});

    assert.equal(report.error, null);
    assert.equal(report.kind, 'luraph_v15');
    assert.equal(report.prechecks, 1);
    assert.ok(fs.existsSync(output));
    const content = fs.readFileSync(output, 'utf8');
    assert.match(content, /NAO FOI DESOFUSCADO DE VERDADE/);
});
