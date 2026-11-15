#!/usr/bin/env node
// deob.js
// Pipeline principal: deteccao, extracao de LPH_ATTRIBUTES/LPH_PRECHECK e
// lifting consciente de ISA.
//
// Status dos estagios (ver README > Status dos estagios):
//   - deteccao, atributos e prechecks: implementados de verdade.
//   - lifting (core/devirt.js) e structuring (core/transforms.js): stubs.
//     Eles so anotam os nos da AST (__lifted / __transform); nao
//     reescrevem bytecode nem removem a VM. O arquivo de saida carrega o
//     source original mais um cabecalho dizendo exatamente isso, para nao
//     fingir um resultado que o projeto ainda nao produz.

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const luaparse = require('luaparse');
const { parseAttributes, collectPrechecks } = require('./core/attributes');
const { hookClosures } = require('./core/vmmap');
const { liftWithISA } = require('./core/devirt');
const { structure } = require('./core/structure');

const STAGE_STATUS = Object.freeze({
    lift: 'stub',      // liftWithISA so anota __lifted
    structure: 'stub',  // liftTransformedFunction so anota __transform
});

function detect(source) {
    if (/LPH_ATTRIBUTES|LPH_NO_VIRTUALIZE|LPH_ENCFUNC|LPH_CRASH/.test(source)) {
        return 'luraph_v15';
    }
    if (/return\(\{|local init = \(function/.test(source)) {
        return 'luraph_v14';
    }
    return 'unknown';
}

function log(flags, msg) {
    if (flags.debug) console.log(msg);
}

function writeAnnotatedOutput(input, output, source, report) {
    const out = output || path.join('output', path.basename(input));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const header = [
        '-- [luraph-v15-deob extended]',
        `-- detected: ${report.kind}`,
        `-- prechecks found: ${report.prechecks}`,
        `-- functions marked lifted: ${report.lifted} (stage "${STAGE_STATUS.lift}" — nao reescreve bytecode ainda)`,
        `-- functions skipped (VM(NONE)): ${report.skipped}`,
        '-- ESTE ARQUIVO NAO FOI DESOFUSCADO DE VERDADE. Ver README > Status dos estagios.',
        '',
    ].join('\n');
    fs.writeFileSync(out, header + source);
    report.output = out;
}

function processOne(input, output, flags) {
    const report = {
        input, kind: 'unknown', prechecks: 0, lifted: 0, skipped: 0,
        parseOk: false, output: null, error: null,
    };

    let source;
    try {
        source = fs.readFileSync(input, 'utf8');
    } catch (e) {
        report.error = `leitura falhou: ${e.message}`;
        return report;
    }

    report.kind = detect(source);
    log(flags, `[*] ${input}: detected ${report.kind}`);

    if (flags.detect) return report;

    let ast;
    try {
        ast = luaparse.parse(source, { luaVersion: '5.1' });
        report.parseOk = true;
    } catch (e) {
        // A versao original seguia com um Block vazio e terminava "com
        // sucesso" mesmo sem ter lido nada da AST. Aqui o parse falhando
        // e um erro de verdade: para o processamento deste arquivo e nao
        // escreve saida nenhuma, em vez de fingir que processou.
        report.error = `parse da AST falhou: ${e.message}`;
        return report;
    }

    const prechecks = collectPrechecks(ast);
    report.prechecks = prechecks.length;
    log(flags, `[*] ${input}: prechecks found: ${prechecks.length}`);

    const functionAttrs = hookClosures(ast, { register: () => {} });

    if (flags.noDevirt) {
        log(flags, `[*] ${input}: --no-devirt setado; pulando lifting.`);
        writeAnnotatedOutput(input, output, source, report);
        return report;
    }

    functionAttrs.forEach((attrs, fnNode) => {
        fnNode.__attrs = attrs;
        if (attrs.vm === 'NONE') { report.skipped++; return; }
        try {
            liftWithISA(fnNode, null);
            report.lifted++;
        } catch (e) {
            log(flags, `[!] ${input}: lift falhou para ${attrs.vm}: ${e.message}`);
        }
    });

    structure(ast, functionAttrs);
    writeAnnotatedOutput(input, output, source, report);
    return report;
}

function collectInputFiles(input) {
    const stat = fs.statSync(input);
    if (stat.isFile()) return [input];
    if (stat.isDirectory()) {
        return fs.readdirSync(input)
            .filter(f => f.endsWith('.lua') || f.endsWith('.luau'))
            .map(f => path.join(input, f));
    }
    throw new Error(`${input} nao e arquivo nem diretorio`);
}

async function runPool(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function take() {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i]);
        }
    }
    const poolSize = Math.max(1, Math.min(limit || 1, items.length));
    await Promise.all(Array.from({ length: poolSize }, take));
    return results;
}

async function main() {
    const program = new Command();
    program
        .name('luraph-deob')
        .argument('<input>', 'arquivo .lua/.luau ou diretorio')
        .option('-o, --output <file>', 'destino do arquivo desofuscado (so para entrada unica)')
        .option('--detect', 'detecta o ofuscador e sai, sem processar', false)
        .option('--debug', 'imprime logs extras de cada estagio', false)
        .option('--no-devirt', 'so roda deteccao/atributos/prechecks, sem lifting')
        .option('--jobs <n>', 'arquivos processados em paralelo quando a entrada e um diretorio', (v) => parseInt(v, 10), 1)
        .parse(process.argv);

    const input = program.args[0];
    const flags = program.opts();
    // commander cria `devirt` (default true) a partir de --no-devirt;
    // normalizamos para o nome usado no resto do pipeline.
    flags.noDevirt = flags.devirt === false;

    let files;
    try {
        files = collectInputFiles(input);
    } catch (e) {
        console.error(`[!] ${e.message}`);
        process.exitCode = 1;
        return;
    }

    if (files.length === 0) {
        console.error(`[!] Nenhum .lua/.luau encontrado em ${input}`);
        process.exitCode = 1;
        return;
    }

    const isBatch = files.length > 1;
    if (isBatch && flags.output) {
        console.error('[!] --output nao se aplica a lote (diretorio); use so com um arquivo.');
        process.exitCode = 1;
        return;
    }

    const reports = await runPool(files, flags.jobs, (file) => processOne(file, flags.output, flags));

    let failed = 0;
    for (const r of reports) {
        if (r.error) {
            failed++;
            console.error(`[!] ${r.input}: ${r.error}`);
            continue;
        }
        if (flags.detect) {
            console.log(`[*] ${r.input}: detected ${r.kind}`);
        } else {
            console.log(
                `[+] ${r.input}: output=${r.output} kind=${r.kind} ` +
                `prechecks=${r.prechecks} lifted=${r.lifted} skipped=${r.skipped}`
            );
        }
    }
    if (isBatch) {
        console.log(`[*] Lote: ${reports.length} arquivo(s), ${failed} falha(s).`);
    }

    if (failed > 0) process.exitCode = 1;
}

if (require.main === module) {
    main().catch(e => {
        console.error(`[!] Fatal: ${e.message}`);
        process.exitCode = 1;
    });
}

module.exports = { detect, processOne, collectInputFiles };
