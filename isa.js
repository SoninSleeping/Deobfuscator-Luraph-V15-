// core/isa.js
// O v15 tem duas ISAs: OPAL (equilíbrio) e ONYX (segurança).
// O mapa ONYX vive em core/onyx_map.json — derive de amostras VM(ONYX).

const fs = require('fs');
const path = require('path');

const OPAL_MAP = require('./vmmap').OPAL_DISPATCH;
let ONYX_MAP = null;

function loadOnyxMap(map) {
    ONYX_MAP = map;
}

function tryLoadOnyxFromDisk() {
    const p = path.join(__dirname, 'onyx_map.json');
    if (fs.existsSync(p)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
            // O arquivo versionado no repo é só um placeholder com
            // "dispatch": {}. Antes, qualquer objeto parseado — mesmo esse —
            // era truthy, então o erro explícito prometido no README nunca
            // disparava e getDispatchMap('ONYX') devolvia o JSON inteiro
            // (com "_comment"/"version" incluídos) em vez do mapa de
            // dispatch de verdade.
            const dispatch = parsed && parsed.dispatch;
            if (dispatch && Object.keys(dispatch).length > 0) {
                ONYX_MAP = dispatch;
                return true;
            }
            return false;
        } catch (_) { return false; }
    }
    return false;
}

function getDispatchMap(vmType) {
    switch (vmType) {
        case 'OPAL': return OPAL_MAP;
        case 'ONYX':
            if (!ONYX_MAP) tryLoadOnyxFromDisk();
            if (!ONYX_MAP) {
                throw new Error(
                    'ONYX ISA map not loaded. Run --debug --keep-work on an ONYX sample ' +
                    'and write the derived map to core/onyx_map.json.'
                );
            }
            return ONYX_MAP;
        case 'NONE': return null;
        default:
            throw new Error(`Unknown VM type: ${vmType}`);
    }
}

module.exports = { getDispatchMap, loadOnyxMap };
