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
            title="1. Escaneo de Mercado (Momentum Detection)"
            description="Cada 15 minutos, el sistema consulta GeckoTerminal
              (CoinGecko on-chain) para descubrir los trending pools reales
              de Ethereum, Base, Solana y Arbitrum — hasta 20 pools por red,
              80 pools totales por ciclo. Filtra por liquidez ($50K–$50M),
              volumen, ratio compras/ventas (buy pressure), aceleración de
              volumen multi-timeframe y antigüedad del par (>2 días). Genera
              un momentum score 0-100. Solo los que superan 55 pasan al
              siguiente filtro. DexScreener se mantiene para datos de
              ejecución (quotes, pares individuales). Coste: $0."
          />
          <Block
            title="2. Validación de Token (Token Health)"
            description="Antes de operar, evalúa la salud del token: liquidez
              real del pool, volumen 24h, spread, concentración de holders
              (top 10) y risk flags del contrato (honeypot, taxes ocultos,
              pares muy nuevos, sin ventas). Si el token no pasa un umbral
              mínimo de salud (60/100), se descarta automáticamente."
          />
          <Block
            title="3. Contexto de Mercado (Régimen)"
            description="Detecta el régimen macro (risk-on, risk-off o neutral)
              combinando el Fear & Greed Index, dominancia de BTC y volumen
              total del mercado — todo con APIs gratuitas. En mercados
              risk-off penaliza las señales y puede pausar la capa agresiva.
              En risk-on amplifica la confianza."
          />
          <Block
            title="4. Confluencia de Señales"
            description="El cerebro del sistema. Combina 4 capas independientes:
              momentum (máx 40 pts), wallet confluence (máx 25 pts), token
              health (máx 20 pts) y régimen (máx 15 pts). Genera un
              confidence score 0-100. Solo opera si alcanza 50+ (Satellite)
              o 75+ (Core). Una señal que solo tiene momentum débil nunca
              pasa. La señal más fuerte: 3+ wallets con buen score comprando
              el mismo token en menos de 6 horas."
          />
          <Block
            title="5. Estrategia Dual: Core + Satellite"
            description="Core (80% del riesgo): operaciones en tokens líquidos
              con alta probabilidad, riesgo por trade 0.5% del capital.
              Satellite (20% del riesgo): pocas operaciones de alta
              asimetría, riesgo 0.25%. Tamaño de posición adaptativo: escala
              con la confianza de la señal y la liquidez del pool, con límite
              de impacto máximo al pool (0.5% Core, 0.3% Satellite)."
          />
          <Block
            title="6. Gestión de Riesgo (Risk Gate)"
            description="Cada operación pasa por el Risk Gate. Reglas no
              negociables: pérdida diaria > 2% → pausa total; pérdida
              semanal > 6% → pausa total; 3 pérdidas seguidas en Satellite
              → cooldown 24h. Los contadores se resetean automáticamente
              cada día (00:00 UTC) y cada semana (lunes)."
          />
          <Block
            title="7. Ejecución Simulada (Paper Trading)"
            description="El Paper Broker opera con precios reales de DexScreener
              y simula slippage, spread, gas y latencia proporcionales a la
              liquidez del pool. Gestión de posiciones abiertas con trailing
              stop dinámico, tiempo máximo de holding, salida por caída de
              volumen/liquidez y take profit escalonado."
          />
          <Block
            title="8. Validación Forward de Señales"
            description="Cada señal generada — ejecutada o no — se registra con
              su precio de entrada. Automáticamente, el sistema vuelve a
              consultar el precio real del token a 1h, 6h, 24h, 48h y 7 días.
              Calcula hit rate y PnL medio por ventana temporal, por layer y
              por régimen de mercado. Esto mide objetivamente si el motor
              genera señales con valor predictivo real."
          />
          <Block
            title="9. Orquestación Automática"
            description="El motor se ejecuta cada 15 minutos vía GitHub Actions
              (gratuito). Vercel mantiene el cron diario de risk reset.
              Cada ciclo: detecta régimen → escanea momentum → evalúa salud
              → calcula confluencia → ejecuta trades → actualiza outcomes de
              señales pasadas → gestiona posiciones abiertas. Todo automático,
              24/7, coste $0."
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
            "GeckoTerminal API",
            "DexScreener API",
            "Arkham API (opcional)",
            "CoinGecko API",
            "Fear & Greed Index",
            "GitHub Actions",
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
            version="0.8.0"
            date="23 feb 2026"
            title="GeckoTerminal: Descubrimiento Real de Tokens Trending"
            items={[
              "Nuevo cliente GeckoTerminal (CoinGecko on-chain): API gratuita, sin API key, con endpoint nativo de trending pools multi-cadena.",
              "MomentumDetector refactorizado: usa GeckoTerminal para descubrir pools trending reales en Ethereum, Base, Solana y Arbitrum (hasta 80 pools/ciclo).",
              "Arquitectura de dos capas: GeckoTerminal descubre tokens con tracción → DexScreener proporciona datos de ejecución (quotes, pares individuales).",
              "Datos multi-timeframe por pool: precio, volumen y transacciones (buys/sells/buyers/sellers) a 5m, 15m, 30m, 1h, 6h y 24h — directos del API.",
              "Deduplicación automática: si un mismo token aparece en múltiples pools trending, solo se analiza una vez.",
              "Dashboard mejorado: 'Último ciclo' muestra pools trending escaneados vs candidatos tras filtro, más claro que el anterior 'tokens escaneados'.",
              "Fix: el sistema ahora escanea tokens reales en cada ciclo. Antes, DexScreener search('trending') buscaba tokens por nombre, devolviendo 0 resultados.",
              "Coste: sigue siendo $0. GeckoTerminal free tier permite ~30 req/min.",
            ]}
          />
          <ChangelogEntry
            version="0.7.0"
            date="23 feb 2026"
            title="Validación Forward + Consola de Simulación + Status Check"
            items={[
              "Signal Outcome Tracker: cada señal generada (ejecutada o rechazada) se registra y se trackea a 1h, 6h, 24h, 48h y 7 días para medir hit rate real.",
              "Tabla signal_outcomes con precios reales post-señal y PnL hipotético por ventana temporal.",
              "Dashboard Validación (/dashboard/validacion): hit rate por ventana, desglose Core vs Satellite, desglose por régimen, tabla de señales recientes con outcomes.",
              "Dashboard Simulación (/dashboard/simulacion): bootstrap de simulación, run cycle manual, métricas de rendimiento, tabla de posiciones, auto-refresh.",
              "GET /api/status: verificación de configuración del sistema (envs, DB, tablas, usuario, risk_state) con pasos pendientes.",
              "Widget de estado en Simulación: muestra visualmente qué está configurado y qué falta antes de poder operar.",
              "Sizing adaptativo: tamaño de posición escala con confianza de señal y liquidez del pool, con cap de impacto al pool.",
              "Crons con cliente admin (service role): los ciclos automáticos ya no dependen de cookies de sesión.",
              "Sección 'Cómo funciona' actualizada con los 9 bloques reales del sistema.",
            ]}
          />
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
