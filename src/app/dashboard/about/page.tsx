export default function AboutPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* ========== HERO / PRESENTACIÓN ========== */}
      <section className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0f1a45] via-[#131f54] to-[#0d1638] p-8 sm:p-10 shadow-[0_24px_60px_rgba(6,8,25,0.6)]">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Soy CTech.
        </h1>
        <p className="mt-3 text-base sm:text-lg leading-relaxed text-cyan-100/90">
          Creado por{" "}
          <span className="font-semibold text-white">Hugo Campos Vázquez</span>{" "}
          con la ayuda de{" "}
          <span className="text-cyan-300">GPT 5.3 &ndash; Codex</span>,{" "}
          <span className="text-indigo-300">Opus 4.6</span>,{" "}
          <span className="text-emerald-300">Arkham</span>,{" "}
          <span className="text-amber-300">Glassnode</span> y{" "}
          <span className="text-rose-300">Dune</span>.
        </p>
      </section>

      {/* ========== QUÉ ES CTECH ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Qué es CTech
        </h2>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
          CTech es un sistema autónomo de copy-trading especializado en tokens
          DeFi. Combina inteligencia de wallets on-chain, validación de salud de
          tokens, análisis de régimen de mercado y un motor de ejecución con
          gestión de riesgo estricta para generar beneficio de forma consistente.
        </p>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
          No es un bot que lanza operaciones a ciegas. Cada decisión pasa por
          múltiples capas de filtrado y validación antes de ejecutarse, y el
          sistema aprende de sus propios resultados para mejorar con cada ciclo.
        </p>
      </section>

      {/* ========== CÓMO FUNCIONA ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Cómo funciona
        </h2>

        <div className="mt-6 space-y-6">
          <Block
            title="1. Wallet Intelligence (Arkham)"
            description="CTech identifica y monitoriza wallets con track record
              demostrado en tokens DeFi. No copia a cualquiera: cada wallet
              recibe un score basado en win-rate, profit factor, drawdown y
              consistencia temporal. Solo las wallets que superan un umbral
              mínimo generan señales operativas."
          />
          <Block
            title="2. Validación de Token (Dune + DEX Data)"
            description="Antes de operar, el sistema evalúa la salud del token:
              liquidez real del pool, volumen 24 h, spread, concentración de
              holders y flags de riesgo del contrato (honeypot, taxes ocultos,
              pausas). Si el token no pasa, la operación se descarta
              automáticamente."
          />
          <Block
            title="3. Contexto de Mercado (Glassnode)"
            description="El sistema detecta el régimen macro (risk-on, risk-off
              o neutral) analizando dominancia de BTC, volatilidad total,
              funding medio y sentimiento. En entornos hostiles reduce exposición
              o pausa la capa agresiva, protegiendo el capital."
          />
          <Block
            title="4. Estrategia Dual: Core + Satellite"
            description="Core (80 % del riesgo): operaciones en tokens líquidos
              con alta probabilidad, RR moderado (1:1.5 – 1:2.5), riesgo
              por trade 0.5 %. Genera beneficio diario estable. Satellite
              (20 % del riesgo): pocas operaciones de alta asimetría (RR 1:5 –
              1:10+), riesgo 0.15 – 0.25 %, buscando rentabilidades potentes.
              Los dos bolsillos tienen presupuesto de pérdida independiente."
          />
          <Block
            title="5. Gestión de Riesgo (Risk Gate)"
            description="Cada operación pasa por el Risk Gate antes de ejecutarse.
              Reglas no negociables: pérdida diaria > 2 % → pausa total;
              pérdida semanal > 6 % → pausa total; 3 pérdidas seguidas en
              Satellite → cooldown de 24 h. El sistema nunca compensa
              pérdidas de Satellite aumentando tamaño en Core."
          />
          <Block
            title="6. Ejecución Realista (Paper → Live)"
            description="El Paper Broker opera con datos de mercado en tiempo real
              y simula slippage, spread, gas y latencia de forma proporcional a
              la liquidez del pool. Mismo pipeline para paper, shadow y live:
              solo cambia el broker final. El sistema debe demostrar 100-200
              operaciones consistentes en paper antes de activar capital real."
          />
          <Block
            title="7. Aprendizaje Continuo"
            description="Cada semana el sistema recalcula scores de wallets y
              umbrales de token health según resultados netos. Solo promueve
              una nueva versión del modelo si supera a la anterior en
              expectancy, profit factor y max drawdown. Sin mejora clara, se
              mantiene la versión actual."
          />
          <Block
            title="8. Orquestación y Scheduling Híbrido"
            description="El motor se ejecuta automáticamente cada 15 minutos
              mediante GitHub Actions llamando GET /api/cron/cycle con
              autenticación por CRON_SECRET. En Vercel se mantiene el cron
              diario de risk reset (00:00 UTC) en /api/cron/risk-reset para
              reiniciar contadores y pausas de riesgo. Esta arquitectura
              mantiene la automatización completa con coste mínimo en planes
              free."
          />
        </div>
      </section>

      {/* ========== MÉTRICAS CLAVE ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Métricas clave que monitoriza
        </h2>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
          <Metric label="Expectancy neta / trade" />
          <Metric label="Profit factor" />
          <Metric label="Max drawdown" />
          <Metric label="Sharpe / Sortino" />
          <Metric label="% meses positivos" />
          <Metric label="Slippage medio" />
          <Metric label="Coste por operación" />
          <Metric label="Estabilidad por régimen" />
        </ul>
      </section>

      {/* ========== STACK TECNOLÓGICO ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Stack tecnológico
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Next.js 15",
            "TypeScript",
            "Tailwind CSS",
            "Supabase",
            "Arkham API",
            "Dune Analytics",
            "Glassnode API",
            "Vercel",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ========== CHANGELOG ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Changelog
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Historial de hitos del sistema, del más reciente al más antiguo.
        </p>

        <ol className="mt-6 relative border-l border-white/10 ml-3 space-y-8">
          <ChangelogEntry
            version="0.6.0"
            date="23 feb 2026"
            title="Ejecución Automática + APIs de Consulta + Risk Reset"
            items={[
              "Scheduler híbrido: GitHub Actions ejecuta el ciclo cada 15 minutos (GET /api/cron/cycle) y Vercel mantiene el cron diario de risk reset.",
              "Risk reset diario: PnL, contadores de trades y pausas expiradas se resetean a las 00:00 UTC. Reset semanal los lunes (PnL semanal, pérdidas consecutivas).",
              "GET /api/positions: posiciones abiertas, cerradas o todas — con filtros y paginación.",
              "GET /api/performance: métricas completas de rendimiento — expectancy, profit factor, win rate, max drawdown, desglose Core vs Satellite, estado de riesgo actual.",
              "POST /api/cycle: ejecución manual de un ciclo completo del motor.",
              "Protección de crons con CRON_SECRET en producción.",
            ]}
          />
          <ChangelogEntry
            version="0.5.0"
            date="23 feb 2026"
            title="Motor de Señales v2: Momentum + Confluencia + Gestión de Posiciones + Orquestador"
            items={[
              "MomentumDetector: escanea DexScreener buscando tokens con volumen anómalo, liquidez creciente, ratio buy/sell alto y precio gradual. Genera momentumScore 0-100 con aceleración de volumen multi-timeframe.",
              "ConfluenceEngine: combina 4 capas independientes (momentum 40 pts, wallet confluence 25 pts, token health 20 pts, régimen 15 pts) para generar un confidence score 0-100. Core si >= 75, Satellite si >= 50.",
              "Wallet confluence: detecta cuando 3+ wallets con buen score compran el mismo token en <6h — la señal más fuerte del sistema.",
              "PositionManager: gestión de trades abiertos con 5 señales de salida — trailing stop dinámico, tiempo máximo, volumen cayendo, liquidez bajando, take profit escalonado.",
              "Orchestrator: pipeline completo end-to-end en un solo ciclo — régimen → momentum → token health → confluencia → riesgo → ejecución → gestión de posiciones.",
              "API: POST /api/cycle ejecuta un ciclo completo del motor. En producción será un cron automático.",
              "El sistema funciona sin Arkham ($0): momentum + DexScreener como señal principal. Arkham se añade como capa de confirmación opcional.",
            ]}
          />
          <ChangelogEntry
            version="0.4.0"
            date="23 feb 2026"
            title="Market Intelligence: Token Health + QuoteFetcher + Régimen de Mercado"
            items={[
              "DexScreenerClient: cliente para DexScreener API (gratis, sin API key, 60 req/min) — precio, liquidez, volumen y pares de DEX en tiempo real.",
              "TokenHealthChecker: evalúa salud de tokens combinando DexScreener (liquidez, volumen, spread, antigüedad) + Arkham holders (concentración top 10). Genera health_score 0-100 con detección de risk flags (low_liquidity, no_sells, very_new_pair, etc.).",
              "DexScreenerQuoteFetcher: implementación de QuoteFetcher que conecta precios reales de DEX con el PaperBroker — las simulaciones ahora usan datos de mercado real.",
              "RegimeDetector: detecta régimen de mercado (risk_on / risk_off / neutral) usando Fear & Greed Index + BTC dominance + volumen total — todo gratis, sin Glassnode.",
              "Auto-registro de tokens: si un token no existe en token_registry, se crea automáticamente al evaluar su salud.",
              "Coste mensual de APIs: $0 para DexScreener, Fear & Greed y CoinGecko. Solo Arkham requiere plan (custom).",
            ]}
          />
          <ChangelogEntry
            version="0.3.0"
            date="23 feb 2026"
            title="Arkham Pipeline: Wallet Intelligence + Signal Generation"
            items={[
              "Cliente Arkham API con rate limiting integrado (1 req/s), tipos de respuesta tipados y manejo de errores robusto.",
              "WalletTracker: escanea swaps (DEX trades) de wallets monitorizadas vía GET /swaps, filtra duplicados y persiste movimientos nuevos.",
              "WalletScorer: empareja compras/ventas por token, calcula win rate, profit factor, drawdown, consistencia y genera score compuesto 0-100.",
              "SignalGenerator: convierte movimientos cualificados en señales operativas — solo si wallet_score >= 70 y token_health >= 65.",
              "Asignación automática de layer: Core (wallet >= 80, token sano) vs Satellite (resto que pase filtros mínimos).",
              "API: GET/POST /api/wallets (gestionar wallets tracked), POST /api/scan (ejecutar ciclo completo: escaneo → scoring → señales).",
              "Página 'Sobre CTech' con presentación para inversores, explicación detallada del sistema y changelog.",
            ]}
          />
          <ChangelogEntry
            version="0.2.0"
            date="23 feb 2026"
            title="Engine: Risk Gate + Paper Broker + modelo de datos completo"
            items={[
              "7 tablas nuevas: tracked_wallets, wallet_scores, wallet_movements, token_registry, token_health_snapshots, market_regimes, risk_state.",
              "Campos nuevos en trades: execution_mode (paper/live/shadow), layer (core/satellite), slippage, gas, latencia, motivo de entrada/salida, scores al momento de operar.",
              "Módulo RiskGate: evaluación pre-trade con kill switches (pérdida diaria -2 %, semanal -6 %, 3 pérdidas consecutivas satellite → cooldown 24 h).",
              "Módulo PaperBroker: ejecución simulada con slippage proporcional a liquidez, gas estimado por red, latencia realista.",
              "Tipos TypeScript compartidos del engine (OrderRequest, FillResult, TradeRecord, RiskConfig, etc.).",
              "Arquitectura dual Core (80 % riesgo, estabilidad) + Satellite (20 % riesgo, alta asimetría).",
            ]}
          />
          <ChangelogEntry
            version="0.1.0"
            date="22 feb 2026"
            title="MVP: Auth + Dashboard + Señales + Trades"
            items={[
              "Autenticación con Supabase (email + contraseña).",
              "Dashboard con KPIs: señales hoy, trades hoy, PnL acumulado.",
              "API: POST /api/signals, POST /api/trades/manual, GET /api/dashboard/kpis.",
              "Modelo de datos inicial: profiles, exchange_connections, signals, trades.",
              "Layout con sidebar, header responsive y deploy en Vercel.",
            ]}
          />
        </ol>
      </section>
    </div>
  );
}

function Block({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-cyan-200">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Metric({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
      {label}
    </li>
  );
}

function ChangelogEntry({
  version,
  date,
  title,
  items,
}: {
  version: string;
  date: string;
  title: string;
  items: string[];
}) {
  return (
    <li className="ml-6">
      <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-cyan-400 bg-[#131b43]" />
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="rounded-full bg-cyan-400/10 border border-cyan-300/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
          v{version}
        </span>
        <span className="text-xs text-slate-500">{date}</span>
      </div>
      <h3 className="mt-1.5 text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs leading-relaxed text-slate-400">
            &bull; {item}
          </li>
        ))}
      </ul>
    </li>
  );
}
