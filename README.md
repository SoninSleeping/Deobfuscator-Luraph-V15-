# Luraph v15 Deobfuscator — Extended

Fork estendido do [caomod2077/Deobfuscator-Luraph-V15](https://github.com/caomod2077/Deobfuscator-Luraph-V15)
com suporte à nova arquitetura do Luraph v15:

- **Parser de `LPH_ATTRIBUTES`** — extrai `VM(OPAL|ONYX|NONE)`, `PRESET(...)` e `TRANSFORM(...)` antes do hooking.
- **ISA dupla** — mapeamento de opcode separado para `OPAL` e `ONYX`.
- **Bypass de `LPH_PRECHECK`** — injeta `expected_return` no sandbox para descriptografar mesmo sem `game.PlaceId`/`UserId`.
- **CFG lift em `VM(NONE)` + `TRANSFORM`** — reaplica SCCP/structuring em funções não virtualizadas com transforms AST.

## Instalação

```bash
git clone https://github.com/SEU_USUARIO/luraph-v15-deob.git
cd luraph-v15-deob
npm install
```

Requer Node.js v18+ e Python 3.10+.

```bash
# Windows
set PYTHON_BIN=py
# Linux/macOS
export PYTHON_BIN=python3
```

## Uso

```bash
# Detecção
node deob.js sample/amostra.lua --detect

# Devirtualização completa
node deob.js sample/amostra.lua -o out.lua

# Com debug (mantém disassembly intermediário)
node deob.js sample/amostra.lua --debug --keep-work -o out.lua

# Trace rápido (~2s, sem lifting)
node deob.js sample/amostra.lua --no-devirt

# Batch
node deob.js ./samples/ --jobs 4
```

## Opções

| Opção | Padrão | Descrição |
|---|---|---|
| `-o, --output <file>` | `./output/<name>` | Destino do arquivo desofuscado |
| `--no-devirt` | `false` | Apenas trace de execução |
| `--no-hooks` | `false` | Desabilita instrumentação de closures |
| `--no-fold` | `false` | Desabilita folding em trace mode |
| `--timeout <sec>` | `90` | Timeout por pass de execução Luau |
| `--budget <sec>` | `30` | Budget de execução do script |
| `--max-runs <n>` | `12` | Máximo de reruns para traps |
| `--devirt-rounds <n>` | `200` | Rodadas de descriptografia de constantes |
| `--detect` | `false` | Detecta ofuscador e sai |
| `--debug` | `false` | Mantém arquivos intermediários |
| `--keep-work` | `false` | Mantém workdir para inspeção |

## Limitações conhecidas

- **ONYX ISA** — o mapa `core/onyx_map.json` precisa ser derivado de amostras reais com `VM(ONYX)`. Sem amostra, `getDispatchMap('ONYX')` lança erro explícito.
- **`LPH_STACKALLOC`** — métodos `pack`/`unpack`/`clear` com indexação 0-based exigem reconhecimento de padrão no CFG (parcial).
- **Luraph v14.8/v14.9** — herda as limitações do projeto original.

## Créditos

Base original: [caomod2077](https://github.com/caomod2077/Deobfuscator-Luraph-V15). Licença MIT.# Deobfuscator-Luraph-V15-
