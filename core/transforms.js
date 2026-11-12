// src/transforms.js
// Funções VM(NONE) com TRANSFORM(CONTROL_FLOW, EXTRACT) passam pelo
// pipeline de structuring mesmo sem passar pela VM.

function liftTransformedFunction(fnNode, transforms) {
    let body = fnNode.body;
    if (!body) return fnNode;

    if (transforms.includes('CONTROL_FLOW')) {
        // TODO: chamar runSCCP + structureCFG do pipeline existente.
        // O projeto original tem esses módulos em core/; aqui mantemos
        // como stub para não quebrar o build.
        fnNode.__transform = (fnNode.__transform || '') + 'CONTROL_FLOW;';
    }

    if (transforms.includes('EXTRACT')) {
        fnNode.__transform = (fnNode.__transform || '') + 'EXTRACT;';
    }

    fnNode.body = body;
    return fnNode;
}

module.exports = { liftTransformedFunction };
