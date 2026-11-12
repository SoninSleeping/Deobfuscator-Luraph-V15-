-- runtime/envlog.luau
-- Carrega o script protegido com override de precheck instalado.

local scriptSource = _G.__SCRIPT_SOURCE or ""
local precheckExpected = _G.__PRE_CHECK_EXPECTED or {}

-- Instala override
local override = loadstring([[
    return function(expected_list)
        local idx = 1
        _G.LPH_PRECHECK = function(_fn, _expected)
            local value = expected_list[idx]
            idx = idx + 1
            if value == nil then return _expected end
            return value
        end
    end
]])()
override(precheckExpected)

-- Carrega e executa o script protegido
local chunk = assert(loadstring(scriptSource))
chunk()
