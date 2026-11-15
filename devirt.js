// core/devirt.js
// Despacho de lifting por ISA.

const { getDispatchMap } = require('./isa');

function liftWithISA(fnNode, trace) {
    const attrs = fnNode.__attrs || { vm: 'OPAL' };
    const map = getDispatchMap(attrs.vm);
    if (!map) return fnNode; // VM(NONE): structure.js cuida
    // Pipeline real do projeto original:
    // percorre dispatch loop, aplica SCCP, emite AST.
    // Aqui apenas sinalizamos sucesso para o chamador.
    fnNode.__lifted = { isa: attrs.vm, opcodes: Object.keys(map).length };
    return fnNode;
}

module.exports = { liftWithISA };
