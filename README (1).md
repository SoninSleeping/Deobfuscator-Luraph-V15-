# Luraph v15 Deobfuscator — Extended

Fork estendido do [caomod2077/Deobfuscator-Luraph-V15](https://github.com/caomod2077/Deobfuscator-Luraph-V15)
com suporte à nova arquitetura do Luraph v15:

- **Parser de `LPH_ATTRIBUTES`** — extrai `VM(OPAL|ONYX|NONE)`, `PRESET(...)` e `TRANSFORM(...)` antes do hooking.
- **ISA dupla** — mapeamento de opcode separado para `OPAL` e `ONYX`.
- **Detecção de `LPH_PRECHECK`** — localiza as chamadas e o valor esperado no AST.
- **Hooking de closures consciente de atributos** — cada função é marcada com o `VM(...)` que ela declara.

## Status dos estágios

Para não prometer mais do que o código entrega, aqui está o estado real de cada parte do pipeline:

| Estágio | Status |
|---|---|
| Detecção (`detect`) | Implementado (heurística por regex; pode ter falso positivo em v14) |
| `LPH_ATTRIBUTES` / `LPH_PRECHECK` (`core/attributes.js`) | Implementado e testado |
| Hooking de closures (`core/vmmap.js`) | Implementado e testado |
| ISA OPAL (`core/isa.js`, `core/vmmap.js`) | Mapa de dispatch (`OPAL_DISPATCH`) ainda vazio — placeholder |
| ISA ONYX (`core/isa.js`) | Lança erro explícito até alguém derivar `core/onyx_map.json` de uma amostra real |
| Lifting (`core/devirt.js`) | **Stub.** Só anota `__lifted`; não reescreve bytecode nem remove a VM |
| Structuring / `TRANSFORM` (`core/transforms.js`) | **Stub.** Só anota `__transform` |
| Emissão (`deob.js`) | Escreve o source original com um cabeçalho dizendo o que foi (ou não) feito — nunca finge um resultado desofuscado que não existe |

Em outras palavras: hoje a ferramenta detecta a versão, lê os metadados de compilação
(`LPH_ATTRIBUTES`, `LPH_PRECHECK`) e mapeia quais funções usam qual VM — mas o
devirtualizador em si (lifting de bytecode, mapa ONYX) não está implementado neste fork.

## Instalação

```bash
git clone https://github.com/SoninSleeping/Deobfuscator-Luraph-V15-.git
cd Deobfuscator-Luraph-V15-
npm install
```

Requer apenas Node.js v18+. (O README anterior pedia Python 3.10+; nada no projeto
usa Python hoje, então essa exigência foi removida.)

## Uso

```bash
# Detecção
node deob.js sample/amostra.lua --detect

# Roda o pipeline (atributos + prechecks + marcação de lifting)
node deob.js sample/amostra.lua -o out.lua

# Com logs extras de cada estágio
node deob.js sample/amostra.lua --debug -o out.lua

# Só detecção/atributos/prechecks, sem tentar lifting
node deob.js sample/amostra.lua --no-devirt -o out.lua

# Lote: processa todo .lua/.luau de um diretório, N arquivos em paralelo
node deob.js ./samples/ --jobs 4
```

## Opções

| Opção | Padrão | Descrição |
|---|---|---|
| `-o, --output <file>` | `./output/<nome>` | Destino do arquivo processado (só para entrada única; erro se usado com um diretório) |
| `--no-devirt` | desligado | Só roda detecção/atributos/prechecks, sem a fase de lifting |
| `--jobs <n>` | `1` | Arquivos processados em paralelo quando a entrada é um diretório |
| `--detect` | `false` | Detecta o ofuscador e sai, sem processar |
| `--debug` | `false` | Imprime logs extras de cada estágio |

As flags `--timeout`, `--budget`, `--max-runs`, `--devirt-rounds`, `--no-hooks` e
`--no-fold` que apareciam aqui antes foram removidas: nenhuma delas estava
conectada a lógica nenhuma, então documentá-las só prometia controle que o
código não oferecia.

## Testes

```bash
npm test
```

Roda a suíte em `test/` com o test runner nativo do Node (`node --test`), cobrindo
`core/attributes.js`, `core/isa.js`, `core/vmmap.js` e `detect()`/`processOne()` de
`deob.js`, incluindo o caso de um arquivo que não dá parse (deve reportar erro e
não escrever saída nenhuma).

## Limitações conhecidas

- **ONYX ISA** — o mapa `core/onyx_map.json` é só um placeholder (`"dispatch": {}`).
  Sem um mapa real derivado de amostras `VM(ONYX)`, `getDispatchMap('ONYX')` lança
  erro explícito, como deveria.
- **OPAL ISA** — `OPAL_DISPATCH` em `core/vmmap.js` também está vazio hoje.
- **Lifting e structuring** — ver a tabela de status acima; são estágios stub.
- **`detect()`** — heurística por regex; o padrão de v14 (`return\(\{`) pode
  reconhecer falsamente código Lua comum que não tem relação com Luraph.
- **Luraph v14.8/v14.9** — herda as limitações do projeto original.

## Créditos

Base original: [caomod2077](https://github.com/caomod2077/Deobfuscator-Luraph-V15). Licença MIT.
