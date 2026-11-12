-- runtime/precheck_override.luau
-- Substitui LPH_PRECHECK por uma função que retorna o expected literal
-- extraído do AST, permitindo derivar a chave de descriptografia mesmo
-- quando game.PlaceId/UserId não existem no sandbox offline.

return function(expected_list)
    local idx = 1
    _G.LPH_PRECHECK = function(_fn, _expected)
        local value = expected_list[idx]
        idx = idx + 1
        if value == nil then
            return _expected
        end
        return value
    end
end
