#!/usr/bin/env node
// deob.js
// Pipeline principal com estágio 0 (atributos) e lifting consciente de ISA.

const fs = require('fs');
const path = require('path');
const { parseAttributes, collectPrechecks } = require('./core/attributes');
const { hookClosures } = require('./core/vmmap');
const { getDispatchMap } = require('./core/isa');
const { liftWithISA } = require('./core/devirt');
const { structure } = require('./core/structure');

function parseArgs(argv) {
    const args = { input: null, output: null, flags: {} };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '-o' || a === '--output') args.output = argv[++i];
        else if (a === '--detect') args.flags.detect = true;
        else if (a === '--debug') args.flags.debug = true;
        else if (a === '--keep-work') args.flags.keepWork = true;
        else if (a === '--no-devirt') args.flags.noDevirt = true;
        else if (a === '--timeout') args.flags.timeout = parseInt(argv[++i], 10);
        else if (a === '--budget') args.flags.budget = parseInt(argv[++i], 10);
        else if (a === '--max-runs') args.flags.maxRuns = parseInt(argv[++i], 10);
        else if (a === '--devirt-rounds') args.flags.devirtRounds = parseInt(argv[++i], 10);
        else if (!a.startsWith('-')) args.input = a;
    }
    return args;
}

function detect(source) {
    if (/LPH_ATTRIBUTES|LPH_NO_VIRTUALIZE|LPH_ENCFUNC|LPH_CRASH/.test(source)) {
        return 'luraph_v15';
    }
    if (/return\(\{|local init = \(function/.test(source)) {
        return 'luraph_v14';
    }
    return 'unknown';
}

async function main() {
    const args = parseArgs(process.argv);
    if (!args.input) {
        console.error('Usage: node deob.js <input.lua> [-o out.lua] [--detect] [--debug]');
        process.exit(1);
    }

    const source = fs.readFileSync(args.input, 'utf8');
    const kind = detect(source);
    console.log(`[*] Detected: ${kind}`);

    if (args.flags.detect) return;

    // ESTÁGIO 0: atributos + prechecks (antes do hooking)
    let ast;
    try {
        const luauParse = require('luau-ast').parse;
        ast = luauParse(source);
    } catch (e) {
        console.warn(`[!] AST parse failed: ${e.message}. Continuing with stub.`);
        ast = { type: 'Block', body: [] };
    }

    const prechecks = collectPrechecks(ast);
    console.log(`[*] Prechecks found: ${prechecks.length}`);

    const functionAttrs = hookClosures(ast, { register: () => {} });

    // ESTÁGIO 2: sandbox com override de precheck (delegado ao harness real)
    const sandboxEnv = { __PRE_CHECK_EXPECTED: prechecks.map(p => p.expected) };
    console.log(`[*] Sandbox env prepared (${prechecks.length} prechecks).`);

    if (args.flags.noDevirt) {
        console.log('[*] --no-devirt set; skipping lifting.');
        return;
    }

    // ESTÁGIO 4: lifting consciente de ISA
    let lifted = 0, skipped = 0;
    functionAttrs.forEach((attrs, fnNode) => {
        fnNode.__attrs = attrs;
        if (attrs.vm === 'NONE') { skipped++; return; }
        try {
            liftWithISA(fnNode, null);
            lifted++;
        } catch (e) {
            console.warn(`[!] Lift failed for ${attrs.vm}: ${e.message}`);
        }
    });
    console.log(`[*] Lifted: ${lifted}, skipped (VM(NONE)): ${skipped}`);

    // ESTÁGIO 4b: structuring (inclui VM(NONE) + TRANSFORM)
    structure(ast, functionAttrs);

    // ESTÁGIO 5: emit
    const out = args.output || path.join('output', path.basename(args.input));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // Placeholder: o projeto original tem o backend de codegen real.
    // Aqui emitimos o source original anotado para não fingir sucesso.
    fs.writeFileSync(out, `-- [luraph-v15-deob extended]\n-- detected: ${kind}\n-- prechecks: ${prechecks.length}\n\n${source}`);
    console.log(`[+] Output: ${out}`);
}

main().catch(e => {
    console.error(`[!] Fatal: ${e.message}`);
    process.exit(1);
});
