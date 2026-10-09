-- Las distribuciones ahora guardan el estado del diseñador ({"v":1,"levels":{...}}).
-- Las del editor anterior arrancan con el amueblado inicial del lugar.
UPDATE "layout" SET "doc" = '{"v":1,"levels":{}}'::jsonb WHERE NOT ("doc" ? 'levels');
