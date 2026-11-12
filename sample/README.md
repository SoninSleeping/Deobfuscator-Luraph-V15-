# Samples

Coloque aqui amostras reais de scripts protegidos pelo Luraph v15 para testar:

- `sample/opal/` — amostras com `VM(OPAL)` (default)
- `sample/onyx/` — amostras com `VM(ONYX)` (necessário para derivar `core/onyx_map.json`)
- `sample/precheck/` — amostras com `LPH_PRECHECK` usando `game.PlaceId`/`UserId`
- `sample/transform/` — amostras com `VM(NONE), TRANSFORM(CONTROL_FLOW, EXTRACT)`

Sem amostras ONYX, `getDispatchMap('ONYX')` lança erro explícito.
