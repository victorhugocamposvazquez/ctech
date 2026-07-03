/** Textos de la wallet — español */
export const t = {
  appName: "Trust Wallet",
  appTagline: "Tu puerta de entrada segura a Web3 en BNB Smart Chain.",
  loading: "Cargando wallet…",

  // Nav
  navHome: "Inicio",
  navTrending: "Tendencias",
  navSwap: "Swap",
  navEarn: "Earn",
  navDiscover: "Explorar",
  navSettings: "Ajustes",

  // Home
  totalBalance: "Balance total",
  send: "Enviar",
  receive: "Recibir",
  swap: "Swap",
  buy: "Comprar",
  crypto: "Cripto",
  nfts: "NFTs",
  noCrypto: "Sin cripto todavía",
  noCryptoHint: "Recibe o compra para empezar",
  noNfts: "Sin NFTs todavía",
  noNftsHint: "Tus coleccionables aparecerán aquí",
  portfolioError: "No se pudieron cargar los balances",
  retry: "Reintentar",

  // Onboarding
  createWallet: "Crear wallet nueva",
  importWallet: "Importar wallet",
  orConnect: "o conectar",
  connecting: "Conectando…",
  connectWallet: "Conectar",
  termsHint:
    "Al continuar aceptas los términos. Nunca compartas tu frase secreta con nadie.",

  createPassword: "Crear contraseña",
  createPasswordHint:
    "Cifra tu wallet en este dispositivo. No se puede recuperar si la olvidas.",
  password: "Contraseña",
  confirmPassword: "Confirmar",
  passwordMin: "Mín. 8 caracteres",
  continue: "Continuar",
  passwordsMismatch: "Las contraseñas no coinciden",
  passwordTooShort: "La contraseña debe tener al menos 8 caracteres",

  secretPhrase: "Frase secreta",
  secretPhraseHint:
    "Anota estas 12 palabras en orden. Es la única forma de recuperar tu wallet.",
  copyPhrase: "Copiar al portapapeles",
  savedPhrase: "He guardado mi frase secreta en un lugar seguro",
  creating: "Creando wallet…",
  continueToWallet: "Entrar a la wallet",
  couldNotSave: "No se pudo guardar la wallet",

  importTitle: "Importar wallet",
  importHint: "Restaura con tu frase secreta o clave privada",
  secretPhraseTab: "Frase secreta",
  privateKeyTab: "Clave privada",
  recoveryPhrase: "Frase de recuperación",
  privateKey: "Clave privada",
  newPassword: "Nueva contraseña",
  importing: "Importando…",
  invalidPhrase: "Frase de recuperación inválida",
  invalidKey: "Clave privada inválida",
  couldNotImport: "No se pudo importar la wallet",

  welcomeBack: "Bienvenido de nuevo",
  unlockHint: "Introduce tu contraseña para desbloquear",
  unlock: "Desbloquear wallet",
  unlocking: "Desbloqueando…",
  wrongPassword: "Contraseña incorrecta",
  forgotPassword: "¿Olvidaste la contraseña?",
  resetWallet: "Restablecer wallet",
  resetWalletHint:
    "Si olvidaste la contraseña, importa de nuevo con tu frase secreta. Se borrará la wallet de este dispositivo.",

  // Send
  sendTitle: "Enviar",
  sendSubtitle: "Transfiere cripto a otra wallet",
  asset: "Activo",
  toAddress: "Dirección destino",
  amount: "Cantidad",
  max: "MÁX",
  available: "Disponible",
  review: "Revisar envío",
  confirmSend: "Confirmar envío",
  sending: "Enviando…",
  confirming: "Confirmando…",
  sendSuccess: "¡Enviado!",
  viewExplorer: "Ver en BscScan",
  sendAnother: "Enviar otro",
  txFailed: "La transacción falló",
  networkFee: "Comisión de red (est.)",
  cancel: "Cancelar",

  // Receive
  receiveTitle: "Recibir",
  receiveSubtitle: "Envía solo activos de",
  yourAddress: "Tu dirección",
  copyAddress: "Copiar dirección",
  copied: "¡Copiado!",
  share: "Compartir",
  networkWarning: "Solo envía activos de esta red. Otros activos se perderán.",

  // Swap
  swapTitle: "Intercambiar",
  swapSubtitle: "Intercambia BNB, USDT y más tokens al instante.",
  openPancake: "Abrir PancakeSwap",
  swapDisclaimer: "Swap externo vía PancakeSwap. Revisa slippage y fees.",

  // Buy
  buyTitle: "Comprar cripto",
  buySubtitle: "Compra con tarjeta o transferencia vía proveedores on-ramp.",
  soon: "Próximamente",
  kycNote: "KYC requerido por el proveedor de pago",

  // Trending
  trendingTitle: "Tendencias",
  trendingSubtitle: "Tokens con más actividad en BSC",
  trendingEmpty: "No hay datos de tendencias",
  volume24h: "Vol. 24h",
  change24h: "24h",

  // Discover
  discoverTitle: "Explorar",
  discoverSubtitle: "DApps y herramientas DeFi en BSC",
  exploreDex: "DexScreener BSC",
  explorePancake: "PancakeSwap",
  exploreBscScan: "BscScan",

  // Earn
  earnTitle: "Earn",
  earnSubtitle: "Staking y yield farming próximamente.",

  // Settings
  network: "Red",
  walletLabel: "Wallet",
  walletLocal: "Wallet principal (local)",
  walletExternal: "Wallet conectada",
  lockWallet: "Bloquear wallet",
  installApp: "Instalar app",
  installedApp: "✓ Instalada como app",
  disconnect: "Desconectar",
  deleteWallet: "Eliminar wallet local",
  deleteConfirm:
    "¿Eliminar la wallet de este dispositivo? Asegúrate de tener guardada tu frase secreta.",
  securityNote:
    "Las wallets locales se cifran en este dispositivo. Nunca compartas tu frase secreta.",
  version: "Web App · v1.0",

  back: "Atrás",
  copyAddressShort: "Copiar dirección",
} as const;

export type WalletRouteTitle =
  | "home"
  | "send"
  | "receive"
  | "swap"
  | "buy"
  | "settings"
  | "trending"
  | "earn"
  | "discover";

export function routeTitle(pathname: string): string {
  if (pathname.includes("/send")) return t.sendTitle;
  if (pathname.includes("/receive")) return t.receiveTitle;
  if (pathname.includes("/swap")) return t.swapTitle;
  if (pathname.includes("/buy")) return t.buyTitle;
  if (pathname.includes("/settings")) return t.navSettings;
  if (pathname.includes("/trending")) return t.trendingTitle;
  if (pathname.includes("/earn")) return t.earnTitle;
  if (pathname.includes("/discover")) return t.discoverTitle;
  return t.appName;
}

export function isSubpage(pathname: string): boolean {
  return pathname !== "/wallet" && pathname.startsWith("/wallet/");
}
