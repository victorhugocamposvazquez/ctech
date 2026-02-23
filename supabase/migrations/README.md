# Historial de migraciones

Este directorio guarda el historial de migraciones SQL de Supabase versionado en Git.

## Convención

- Formato de archivo: `YYYYMMDDHHMMSS_descripcion.sql`
- Orden de ejecución: por timestamp ascendente
- Una migración por cambio lógico de esquema

## Listado actual

| Orden | Archivo | Descripción |
|---|---|---|
| 1 | `20260222223000_init_schema.sql` | Migración inicial (referencia al snapshot base). |
| 2 | `20260223120000_engine_tables.sql` | Engine: tracked_wallets, wallet_scores, wallet_movements, token_registry, token_health_snapshots, market_regimes, risk_state + campos nuevos en trades. |
| 3 | `20260223180000_signal_outcomes.sql` | Signal outcomes: tracking de evolución de precio post-señal para validación forward del sistema. |

## Cómo añadir una nueva migración

1. Crea un archivo nuevo con timestamp:
   - Ejemplo: `20260301110000_add_strategy_tables.sql`
2. Escribe SQL incremental (ALTER/CREATE/DROP) para el cambio.
3. Actualiza esta tabla con el nuevo archivo.
4. Aplica en Supabase SQL Editor o con Supabase CLI.
