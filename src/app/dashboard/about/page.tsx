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
            title="1. Escaneo de Mercado — Trending (Momentum Detection)"
            description="Cada 15 minutos, el sistema consulta GeckoTerminal
              (CoinGecko on-chain) para descubrir los trending pools reales
              de Ethereum, Base, Solana y Arbitrum — hasta 20 pools por red,
              80 pools totales por ciclo. Filtra por liquidez ($50K–$50M),
              volumen, ratio compras/ventas (buy pressure), aceleración de
              volumen multi-timeframe y antigüedad del par (>2 días). Genera
              un momentum score 0-100. Solo los que superan 55 pasan al
              siguiente filtro. Alimenta preferentemente la capa Core.
              Coste: $0."
          />
          <Block
            title="2. Escaneo de Mercado — Early Detection"
            description="En paralelo al trending, el sistema escanea pools
              recién creados (últimas 72h) buscando tokens en fase temprana
              con potencial. Usa GeckoTerminal /new_pools. Filtros anti-scam:
              liquidez mínima $5K pero creciendo, ratio buyers/sellers únicos
              > 1.2 (compras orgánicas de muchos wallets, no bots), edad
              mínima 1h, precio no parabólico (<200% en 24h), y patrón de
              actividad orgánica (muchas compras pequeñas > pocas grandes).
              Genera un early score 0-100. Alimenta la capa Satellite.
              Coste: $0."
          />
          <Block
            title="3. Validación de Token (Token Health)"
            description="Antes de operar, evalúa la salud del token: liquidez
              real del pool, volumen 24h, spread, concentración de holders
              (top 10) y risk flags del contrato (honeypot, taxes ocultos,
              sin ventas). Para trending: umbral 60/100. Para early: umbral
              40/100 pero con veto absoluto en flags críticos (no_sells,
              zero_price → honeypot probable)."
          />
          <Block
            title="4. Contexto de Mercado (Régimen)"
            description="Detecta el régimen macro (risk-on, risk-off o neutral)
              combinando el Fear & Greed Index, dominancia de BTC y volumen
              total del mercado — todo con APIs gratuitas. En mercados
              risk-off penaliza las señales y puede pausar la capa agresiva.
              En risk-on amplifica la confianza."
          />
          <Block
            title="5. Confluencia de Señales + Wallet Intelligence"
            description="El cerebro del sistema. Dos pipelines de scoring:
              Para trending: momentum (40 pts) + wallets (25 pts) + health
              (20 pts) + régimen (15 pts). Para early: early score (35 pts)
              + wallets con BOOST x1.5 (30 pts) + health (15 pts) + organic
              patterns (10 pts) + régimen (10 pts). Si smart wallets compran
              un token recién nacido, esa es la señal más potente del sistema.
              Umbrales: 50+ Satellite, 75+ Core."
          />
          <Block
            title="6. Estrategia Dual: Core + Satellite"
            description="Core (80% del riesgo): tokens trending con alta
              confluencia, riesgo por trade 0.5% del capital.
              Satellite (20% del riesgo): tokens tempranos con potencial
              asimétrico, riesgo 0.25%. Un solo acierto early puede
              compensar 10 pérdidas. Tamaño de posición adaptativo: escala
              con la confianza de la señal y la liquidez del pool."
          />
          <Block
            title="7. Gestión de Riesgo Adaptativa (AdaptiveRiskGate)"
            description="Cada operación pasa por el Risk Gate. Reglas no
              negociables: pérdida diaria > 2% → pausa total; pérdida
              semanal > 6% → pausa total; 3 pérdidas seguidas en Satellite
              → cooldown 24h. Además, el sizing se ajusta dinámicamente:
              si el profit factor rolling cae por debajo de 0.8 → sizing ×0.5;
              si sube de 1.5 → sizing ×1.25. Drawdown > 3% reduce progresivamente.
              Drawdown > 10% → pausa adaptativa automática. Kelly criterion
              como techo de posición por capa."
          />
          <Block
            title="8. Ejecución Simulada Avanzada (Paper Trading)"
            description="El Paper Broker opera con precios reales de DexScreener
              e integra 3 capas de realismo: (1) SlippageModel AMM (x·y=k)
              calcula slippage no-lineal según tamaño vs profundidad del pool;
              (2) MicroVolatility aplica Geometric Brownian Motion al precio
              durante la latencia de ejecución; (3) CompetitionSimulator
              simula MEV, front-running y back-running con probabilidades
              según red, visibilidad del trade y densidad de bots. Gestión
              de posiciones con trailing stop, tiempo máximo, salida por
              caída de volumen/liquidez y take profit escalonado."
          />
          <Block
            title="9. Smart Money Simulado"
            description="SmartMoneySimulator genera actividad de wallets sintéticas
              (Alpha Whale, DeFi OG, Early Sniper, Trend Surfer, Patient Whale)
              de forma determinista por (token + fecha). Cada wallet tiene su
              estilo, win rate histórico y redes preferidas. Los movimientos
              se persisten en wallet_movements y el ConfluenceEngine los
              detecta como wallet confluence real. Permite validar señales
              incluso sin Arkham API."
          />
          <Block
            title="10. Validación Forward + Reentrenamiento Incremental v2"
            description="Cada señal generada se registra con su precio de entrada.
              El sistema consulta el precio real a 1h, 6h, 24h, 48h y 7d
              para calcular hit rate y PnL medio. El IncrementalCalibrator v2
              usa esos outcomes para auto-ajustar umbrales con pasos adaptativos
              (±2-4 pts según gap vs target). Nuevo: trackea exposición
              acumulada por detector (momentum vs early), calcula profit factor
              por pipeline, detecta overlap entre detectores y recomienda
              sesgo (momentum-biased, early-biased o balanced). Si un detector
              domina >70% de exposure pero tiene peor PF → rebalancea."
          />
          <Block
            title="11. Simulación de Eventos Extremos (Stress Testing)"
            description="El StressEventSimulator modela 5 tipos de black swan:
              liquidity rug (LP retira liquidez), flash crash (liquidaciones
              en cascada), exploit/hack (contrato drenado), whale dump
              (gran holder vende) y oracle failure (feed manipulado). Dos
              modos: (1) rollForEvent() — check probabilístico en cada fill
              del PaperBroker, modulado por liquidez, edad del par y layer;
              (2) runStressTest() — test determinista que evalúa N escenarios
              contra cada posición abierta. Devuelve pérdida media/máxima,
              tasa de supervivencia y % de eventos que RiskGate atraparía."
          />
          <Block
            title="12. Monitor de Sensibilidad"
            description="El SensitivityMonitor evalúa cómo cambios de ±5% y ±10%
              en parámetros clave (momentum threshold, early threshold,
              confianza core/satellite, trailing stop, max daily loss)
              afectarían profit factor, expectancy, win rate y drawdown.
              Identifica el parámetro más sensible del sistema y genera
              una recomendación accionable. Accesible desde el dashboard."
          />
          <Block
            title="13. Capital Scaling — Saturación de Edge"
            description="El CapitalScalingSimulator proyecta cómo se degrada el
              edge al crecer el capital ($500 → $1M). Modela el incremento
              no-lineal de slippage en pools micro/small-cap, la limitación
              de posiciones por profundidad del pool, y la saturación de
              oportunidades. Calcula: capital óptimo (máximo edge), capital
              de breakeven (edge = 0), PnL mensual proyectado por nivel
              de capital. Permite planificar scaling responsable."
          />
          <Block
            title="14. Predicción Forward — Monte Carlo"
            description="El ForwardPredictor ejecuta 5.000 simulaciones Monte Carlo
              sobre la distribución reciente de trades para proyectar a 7d y 30d:
              PnL esperado con percentiles (P10/P25/P50/P75/P90), drawdown
              esperado con P90/P95, probabilidad de drawdown >5% y >10%,
              racha de pérdidas esperada y P90, probabilidad de PnL positivo,
              y riesgo de ruina (pérdida >5% del capital). Usa distribución
              Student-t para modelar fat tails propios de DeFi."
          />
          <Block
            title="15. Métricas Rolling y Forward-Looking"
            description="El RollingPerformanceEngine calcula métricas en ventanas
              de 7 y 30 días: profit factor por capa, expectancy ajustada
              por slippage/gas/competencia, drawdown actual y máximo,
              Kelly criterion, PnL proyectado 7d, rachas (W/L streaks),
              recovery factor. Alimenta el AdaptiveRiskGate y se muestra
              en el dashboard para toma de decisiones informada."
          />
          <Block
            title="16. Orquestación Automática — Doble Pipeline + Stress"
            description="Cada ciclo: (0) Carga rolling metrics + calibra umbrales
              con exposición cruzada + forward prediction Monte Carlo →
              (1) Detecta régimen → (2) Inyecta smart money simulado →
              (3) Pipeline Trending con stress events probabilísticos →
              (4) Pipeline Early con wallet boost →
              (5) Actualiza outcomes → (6) Gestiona posiciones.
              Stress events se registran en el ciclo. Análisis avanzado
              (stress test, sensibilidad, capital scaling) bajo demanda
              desde el dashboard. Todo automático, 24/7, $0."
          />
        </div>
      </section>

      {/* ========== MÉTRICAS CLAVE ========== */}
      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
        <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
          Métricas clave que monitoriza
        </h2>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
          <Metric label="Expectancy ajustada por slippage+gas+MEV" />
          <Metric label="Profit factor rolling (7d / 30d)" />
          <Metric label="Max drawdown y drawdown actual" />
          <Metric label="Kelly criterion por capa" />
          <Metric label="PnL proyectado 7d" />
          <Metric label="Avg slippage (AMM + competencia)" />
          <Metric label="Recovery factor" />
          <Metric label="Rachas (W/L streaks)" />
          <Metric label="Calibración auto (umbrales + exposición)" />
          <Metric label="Hit rate por régimen" />
          <Metric label="Monte Carlo PnL percentiles (P10-P90)" />
          <Metric label="Prob. drawdown > 5% / > 10%" />
          <Metric label="Risk of ruin (pérdida >5% capital)" />
          <Metric label="Stress test: supervivencia y captura RiskGate" />
          <Metric label="Sensibilidad: parámetro más impactante" />
          <Metric label="Capital scaling: edge óptimo y breakeven" />
          <Metric label="Exposición por detector (momentum vs early)" />
          <Metric label="Detector interaction (PF, overlap, bias)" />
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
            version="1.1.0"
            date="23 feb 2026"
            title="Stress Testing, Sensibilidad, Capital Scaling, Monte Carlo, Calibrador v2"
            items={[
              "StressEventSimulator: simula 5 tipos de black swan (rug pull, flash crash, exploit, whale dump, oracle failure). Check probabilístico en cada fill + test determinista bajo demanda.",
              "SensitivityMonitor: evalúa impacto de ±5/10% en parámetros clave sobre PF, expectancy, win rate y drawdown. Identifica parámetro más sensible con recomendación.",
              "CapitalScalingSimulator: proyecta edge, slippage y saturación de pools desde $500 hasta $1M. Calcula capital óptimo y breakeven.",
              "ForwardPredictor: 5.000 simulaciones Monte Carlo con Student-t (fat tails). PnL percentiles, probabilidad de drawdown, rachas y risk of ruin a 7d/30d.",
              "IncrementalCalibrator v2: step size adaptativo (±2-4 pts), tracking de exposición por detector, profit factor por pipeline, detección de overlap, recomendación de bias.",
              "PaperBroker con stress events: cada fill tiene probabilidad de rug pull, flash crash, etc. Liquidez y precio se ajustan in-situ si ocurre evento.",
              "Orchestrator integra forward prediction Monte Carlo y registra stress events por ciclo.",
              "API /api/simulation/stress-test: test de estrés bajo demanda contra posiciones abiertas.",
              "API /api/simulation/sensitivity: análisis de sensibilidad paramétrica.",
              "API /api/simulation/capital-scaling: proyección de scaling con curva de edge.",
              "API /api/performance ampliada con forwardPrediction7d y forwardPrediction30d.",
              "Dashboard: sección 'Predicción Forward' con percentiles Monte Carlo. Sección 'Análisis Avanzado' con 3 botones (Stress Test, Sensibilidad, Capital Scaling) y resultados inline.",
              "Migración calibration_v2: columnas exposure_momentum_pct, exposure_early_pct, detector_interaction (JSONB).",
              "About: 16 bloques en 'Cómo funciona' (antes 12). Métricas ampliadas a 18.",
              "Coste: sigue $0.",
            ]}
          />
          <ChangelogEntry
            version="1.0.0"
            date="23 feb 2026"
            title="Simulador Avanzado: AMM Slippage, MEV, GBM, Auto-Calibración, Smart Money Sintético"
            items={[
              "SlippageModel: slippage no lineal basado en curva AMM constant-product (x*y=k). Considera profundidad del pool, tamaño de posición, fee LP y liquidez concentrada.",
              "MicroVolatility: movimiento browniano geométrico (GBM) aplicado al precio durante la latencia de ejecución. Estima volatilidad automáticamente desde priceChange1h.",
              "CompetitionSimulator: simula MEV, front-running y back-running con probabilidades basadas en red (ETH=35%, Solana=5%), visibilidad del trade y densidad de bots.",
              "AdaptiveRiskGate: extiende RiskGate con sizing dinámico basado en profit factor rolling, drawdown actual y Kelly criterion. Pausa automática si drawdown > 10%.",
              "RollingPerformanceEngine: calcula métricas rolling (7d/30d) — profit factor, expectancy ajustada por slippage/gas/competencia, Kelly, drawdown, rachas, PnL proyectado.",
              "IncrementalCalibrator: auto-tuning de umbrales (momentum score, early score, confianza core/satellite) basado en hit rate y expectancy recientes. Paso ±2 pts para evitar oscilación.",
              "SmartMoneySimulator: genera actividad de wallets simuladas (Alpha Whale, DeFi OG, Early Sniper, etc.) de forma determinista por (token+fecha). Alimenta ConfluenceEngine sin depender de Arkham.",
              "PaperBroker reescrito: integra SlippageModel + MicroVolatility + CompetitionSimulator en cada fill. Metadata enriquecida (priceImpact, depthScore, wasFrontrun, noisePct).",
              "Orchestrator mejorado: carga rolling metrics al inicio, alimenta AdaptiveRiskGate, recalibra umbrales con IncrementalCalibrator, inyecta smart money antes de evaluar confluencia.",
              "Dashboard con métricas rolling/forward-looking: profit factor, drawdown, expectancy ajustada, Kelly, PnL proyectado 7d, costes de competencia, rachas — comparativa 30d vs 7d.",
              "API /api/performance ampliada con rolling7d y rolling30d.",
              "Nueva tabla calibration_state para persistir umbrales auto-ajustados.",
              "Coste: sigue $0.",
            ]}
          />
          <ChangelogEntry
            version="0.9.0"
            date="23 feb 2026"
            title="Early Detection + Wallet Boost: Doble Pipeline de Descubrimiento"
            items={[
              "EarlyDetector: nuevo módulo que escanea pools recién creados (últimas 72h) en busca de tokens en fase temprana con tracción orgánica.",
              "Filtros anti-scam para early: liquidez mínima $5K, edad mínima 1h, ratio buyers/sellers > 1.2, patrón de compras orgánico, veto en flags críticos (no_sells, zero_price).",
              "Wallet Boost para early signals: si smart wallets compran un token temprano, la confianza se multiplica x1.5 — la señal más fuerte del sistema.",
              "ConfluenceEngine con evaluateEarly(): scoring separado para tokens tempranos con umbrales más bajos de health (40 vs 60) pero más exigentes en anti-scam.",
              "Orchestrator con doble pipeline: Trending → Core/Satellite + Early → Satellite. Deduplicación automática por token.",
              "Dashboard muestra trending pools + early pools escaneados y candidatos por separado.",
              "Errores de GeckoTerminal ahora visibles en el dashboard — antes se tragaban silenciosamente.",
              "About actualizado con 10 bloques (nuevo: Early Detection, Wallet Intelligence integrada).",
              "Coste total: sigue $0.",
            ]}
          />
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
