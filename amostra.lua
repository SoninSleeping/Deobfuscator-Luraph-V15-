-- sample/amostra.lua
-- Fixture sintética para testes e para o `npm test`/`npm run detect`.
-- NÃO é um script real protegido pelo Luraph — é só um esqueleto com os
-- marcadores que o pipeline (detect/attributes/prechecks) precisa
-- reconhecer, para dar para testar sem depender de uma amostra real.

local function protected_opal()
    LPH_ATTRIBUTES({VM("OPAL")})
    return 1 + 1
end

local function protected_none_transform()
    LPH_ATTRIBUTES({VM("NONE"), TRANSFORM("CONTROL_FLOW", "EXTRACT")})
    return "sem VM, so transforms"
end

local function with_precheck()
    LPH_PRECHECK(function()
        return true
    end, 424242)
    return "ok"
end

print(protected_opal())
print(protected_none_transform())
print(with_precheck())
