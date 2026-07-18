export type LandingLocale =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "de"
  | "zh"
  | "ja"
  | "ko"
  | "ru"
  | "tr";

export const LANDING_LOCALES: {
  code: LandingLocale;
  label: string;
  native: string;
}[] = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
];

export type LandingCopy = {
  brand: string;
  navWallet: string;
  navOpen: string;
  chainsLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  statsUsers: string;
  statsUsersLabel: string;
  statsChains: string;
  statsChainsLabel: string;
  statsSelfCustody: string;
  statsSelfCustodyLabel: string;
  sectionDecentralizedTitle: string;
  sectionDecentralizedBody: string;
  featureKeysTitle: string;
  featureKeysBody: string;
  featureCloudTitle: string;
  featureCloudBody: string;
  featureMultiTitle: string;
  featureMultiBody: string;
  privacyTitle: string;
  privacyBody: string;
  privacyPoint1Title: string;
  privacyPoint1Body: string;
  privacyPoint2Title: string;
  privacyPoint2Body: string;
  privacyPoint3Title: string;
  privacyPoint3Body: string;
  howTitle: string;
  howBody: string;
  how1Title: string;
  how1Body: string;
  how2Title: string;
  how2Body: string;
  how3Title: string;
  how3Body: string;
  toolsTitle: string;
  toolsBody: string;
  toolSendTitle: string;
  toolSendBody: string;
  toolReceiveTitle: string;
  toolReceiveBody: string;
  toolSwapTitle: string;
  toolSwapBody: string;
  toolDiscoverTitle: string;
  toolDiscoverBody: string;
  compareTitle: string;
  compareBody: string;
  compareLeftTitle: string;
  compareLeft1: string;
  compareLeft2: string;
  compareLeft3: string;
  compareRightTitle: string;
  compareRight1: string;
  compareRight2: string;
  compareRight3: string;
  networkTitle: string;
  networkBody: string;
  networkBnbTitle: string;
  networkBnbBody: string;
  networkOpenTitle: string;
  networkOpenBody: string;
  networkPwaTitle: string;
  networkPwaBody: string;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
  footerRights: string;
  footerWallet: string;
  language: string;
};

const en: LandingCopy = {
  brand: "Trust Wallet Cloud",
  navWallet: "Wallet",
  navOpen: "Open wallet",
  chainsLabel: "Compatible networks",
  heroTitle: "True crypto ownership.\nThe most decentralized wallet.",
  heroSubtitle:
    "Trust Wallet Cloud — self-custody in the cloud. Your keys stay yours. No intermediaries holding your crypto.",
  ctaPrimary: "Open wallet",
  ctaSecondary: "Learn more",
  statsUsers: "Self-custody",
  statsUsersLabel: "first",
  statsChains: "100+",
  statsChainsLabel: "blockchains",
  statsSelfCustody: "0",
  statsSelfCustodyLabel: "keys on our servers",
  sectionDecentralizedTitle: "Built for true ownership",
  sectionDecentralizedBody:
    "Trust Wallet Cloud takes the Trust experience further: a decentralized wallet you run as a progressive web app, with encryption on your device and sync designed so only you unlock your assets.",
  featureKeysTitle: "Your keys, your crypto",
  featureKeysBody:
    "We never store your seed phrase or private keys on our servers. Recovery lives with you.",
  featureCloudTitle: "Cloud without custody",
  featureCloudBody:
    "Install once, open from any device. Encrypted sync keeps settings and wallets under your control.",
  featureMultiTitle: "One platform, many chains",
  featureMultiBody:
    "Send, receive, swap and discover assets across major networks — starting with BNB Smart Chain.",
  privacyTitle: "Stay private and secure",
  privacyBody:
    "Security measures keep you in control of your data and digital assets — without us holding the keys.",
  privacyPoint1Title: "Device-side encryption",
  privacyPoint1Body:
    "Sensitive material is encrypted locally before anything leaves your device.",
  privacyPoint2Title: "No key custody",
  privacyPoint2Body:
    "Trust Wallet Cloud cannot move funds for you. Only you authorize transactions.",
  privacyPoint3Title: "Open from anywhere",
  privacyPoint3Body:
    "Access your wallet as a PWA — decentralized by design, available on mobile and desktop.",
  howTitle: "How decentralization works here",
  howBody:
    "No bank in the middle. Your wallet is created, encrypted and unlocked on your device — the network settles every transfer.",
  how1Title: "1. Create or import on-device",
  how1Body:
    "Generate a new wallet or import your seed. The secret stays in encrypted storage on your phone or browser — never in plain text on a server.",
  how2Title: "2. You sign every move",
  how2Body:
    "Sends and approvals require your unlock. Trust Wallet Cloud cannot broadcast a transaction without you.",
  how3Title: "3. The chain is the ledger",
  how3Body:
    "Balances and transfers live on public blockchains like BNB Smart Chain. Anyone can verify; no one holds your keys for you.",
  toolsTitle: "Everything you need in one place",
  toolsBody:
    "The same flows you expect from a modern self-custody wallet — built to open as a cloud PWA without surrendering ownership.",
  toolSendTitle: "Send",
  toolSendBody:
    "Transfer tokens to any address. You review the amount, gas and destination before signing.",
  toolReceiveTitle: "Receive",
  toolReceiveBody:
    "Share your address or QR. Funds arrive on-chain — visible in your portfolio once confirmed.",
  toolSwapTitle: "Swap",
  toolSwapBody:
    "Exchange assets without depositing into a centralized exchange that keeps custody of your funds.",
  toolDiscoverTitle: "Discover",
  toolDiscoverBody:
    "Explore tokens and activity while staying in a self-custodial environment you control.",
  compareTitle: "Cloud does not mean custody",
  compareBody:
    "Centralized apps hold your assets. Trust Wallet Cloud is designed so convenience never replaces ownership.",
  compareLeftTitle: "Custodial apps & exchanges",
  compareLeft1: "They can freeze or move balances",
  compareLeft2: "You trust their database, not the chain",
  compareLeft3: "Withdrawal depends on their approval",
  compareRightTitle: "Trust Wallet Cloud",
  compareRight1: "Only your signature moves funds",
  compareRight2: "The blockchain is the source of truth",
  compareRight3: "Open as a PWA — install, unlock, go",
  networkTitle: "On-chain by design",
  networkBody:
    "Decentralization is not a slogan: settlements happen on public networks you can inspect yourself.",
  networkBnbTitle: "BNB Smart Chain ready",
  networkBnbBody:
    "Start with BNB, USDT, USDC and major BEP-20 assets — with a portfolio that reflects on-chain reality.",
  networkOpenTitle: "Open verification",
  networkOpenBody:
    "Addresses and transactions are public. Anyone can check explorers — transparency without giving up your seed.",
  networkPwaTitle: "No app-store gatekeeper",
  networkPwaBody:
    "Install from the web to your home screen. Access Web3 without waiting for a store review to hold your keys.",
  finalTitle: "Own your crypto. Fully.",
  finalBody:
    "Open the most decentralized Trust Wallet experience — ready in your browser or home screen.",
  finalCta: "Launch wallet",
  footerRights: "Trust Wallet Cloud. True crypto ownership.",
  footerWallet: "Go to wallet",
  language: "Language",
};

const es: LandingCopy = {
  brand: "Trust Wallet Cloud",
  navWallet: "Wallet",
  navOpen: "Abrir wallet",
  chainsLabel: "Redes compatibles",
  heroTitle: "Propiedad real de tu crypto.\nLa wallet más descentralizada.",
  heroSubtitle:
    "Trust Wallet Cloud — autocustodia en la nube. Tus claves son tuyas. Sin intermediarios que guarden tu crypto.",
  ctaPrimary: "Abrir wallet",
  ctaSecondary: "Saber más",
  statsUsers: "Autocustodia",
  statsUsersLabel: "primero",
  statsChains: "100+",
  statsChainsLabel: "blockchains",
  statsSelfCustody: "0",
  statsSelfCustodyLabel: "claves en nuestros servidores",
  sectionDecentralizedTitle: "Diseñada para la propiedad real",
  sectionDecentralizedBody:
    "Trust Wallet Cloud lleva la experiencia Trust más lejos: una wallet descentralizada como PWA, con cifrado en tu dispositivo y sincronización pensada para que solo tú desbloquees tus activos.",
  featureKeysTitle: "Tus claves, tu crypto",
  featureKeysBody:
    "Nunca guardamos tu frase semilla ni claves privadas en nuestros servidores. La recuperación es tuya.",
  featureCloudTitle: "Nube sin custodia",
  featureCloudBody:
    "Instálala una vez y ábrela en cualquier dispositivo. La sync cifrada mantiene wallets y ajustes bajo tu control.",
  featureMultiTitle: "Una plataforma, muchas cadenas",
  featureMultiBody:
    "Envía, recibe, intercambia y descubre activos en las principales redes — empezando por BNB Smart Chain.",
  privacyTitle: "Privacidad y seguridad",
  privacyBody:
    "Medidas que te mantienen al mando de tus datos y activos — sin que nosotros tengamos las claves.",
  privacyPoint1Title: "Cifrado en el dispositivo",
  privacyPoint1Body:
    "Lo sensible se cifra en local antes de salir de tu dispositivo.",
  privacyPoint2Title: "Sin custodia de claves",
  privacyPoint2Body:
    "Trust Wallet Cloud no puede mover fondos por ti. Solo tú autorizas transacciones.",
  privacyPoint3Title: "Ábrela donde quieras",
  privacyPoint3Body:
    "Usa la wallet como PWA — descentralizada por diseño, en móvil y escritorio.",
  howTitle: "Así funciona la descentralización aquí",
  howBody:
    "Sin un banco en medio. Tu wallet se crea, cifra y desbloquea en tu dispositivo — la red liquida cada transferencia.",
  how1Title: "1. Crea o importa en el dispositivo",
  how1Body:
    "Genera una wallet nueva o importa tu frase. El secreto queda cifrado en tu teléfono o navegador — nunca en claro en un servidor.",
  how2Title: "2. Tú firmas cada movimiento",
  how2Body:
    "Envíos y aprobaciones requieren tu desbloqueo. Trust Wallet Cloud no puede emitir una transacción sin ti.",
  how3Title: "3. La cadena es el libro mayor",
  how3Body:
    "Saldos y transferencias viven en blockchains públicas como BNB Smart Chain. Cualquiera puede verificar; nadie guarda tus claves por ti.",
  toolsTitle: "Todo lo que necesitas, en un solo sitio",
  toolsBody:
    "Los flujos de una wallet moderna de autocustodia — abiertos como PWA en la nube sin renunciar a la propiedad.",
  toolSendTitle: "Enviar",
  toolSendBody:
    "Transfiere tokens a cualquier dirección. Revisas cantidad, gas y destino antes de firmar.",
  toolReceiveTitle: "Recibir",
  toolReceiveBody:
    "Comparte tu dirección o QR. Los fondos llegan on-chain y se reflejan en tu portfolio al confirmarse.",
  toolSwapTitle: "Intercambiar",
  toolSwapBody:
    "Cambia activos sin depositar en un exchange centralizado que custodia tus fondos.",
  toolDiscoverTitle: "Descubrir",
  toolDiscoverBody:
    "Explora tokens y actividad sin salir de un entorno de autocustodia que controlas tú.",
  compareTitle: "Nube no significa custodia",
  compareBody:
    "Las apps centralizadas guardan tus activos. Trust Wallet Cloud está pensada para que la comodidad no sustituya la propiedad.",
  compareLeftTitle: "Apps y exchanges custodiales",
  compareLeft1: "Pueden congelar o mover saldos",
  compareLeft2: "Confías en su base de datos, no en la cadena",
  compareLeft3: "Retirar depende de su aprobación",
  compareRightTitle: "Trust Wallet Cloud",
  compareRight1: "Solo tu firma mueve fondos",
  compareRight2: "La blockchain es la fuente de verdad",
  compareRight3: "Ábrela como PWA — instala, desbloquea y listo",
  networkTitle: "On-chain por diseño",
  networkBody:
    "La descentralización no es un eslogan: los asentamientos ocurren en redes públicas que puedes inspeccionar tú mismo.",
  networkBnbTitle: "Lista para BNB Smart Chain",
  networkBnbBody:
    "Empieza con BNB, USDT, USDC y los principales BEP-20 — con un portfolio que refleja la realidad on-chain.",
  networkOpenTitle: "Verificación abierta",
  networkOpenBody:
    "Direcciones y transacciones son públicas. Cualquiera puede mirar exploradores — transparencia sin ceder tu seed.",
  networkPwaTitle: "Sin portero de las tiendas",
  networkPwaBody:
    "Instálala desde la web a tu pantalla de inicio. Accede a Web3 sin esperar a que una store valide tu autocustodia.",
  finalTitle: "Tu crypto. De verdad tuya.",
  finalBody:
    "Abre la experiencia Trust Wallet más descentralizada — en el navegador o en la pantalla de inicio.",
  finalCta: "Abrir wallet",
  footerRights: "Trust Wallet Cloud. Propiedad real de tu crypto.",
  footerWallet: "Ir a la wallet",
  language: "Idioma",
};

const pt: LandingCopy = {
  ...en,
  navWallet: "Carteira",
  navOpen: "Abrir carteira",
  heroTitle: "A versão mais descentralizada da carteira",
  heroSubtitle:
    "Autocustódia na nuvem. Suas chaves são suas — sem intermediários guardando sua crypto.",
  ctaPrimary: "Abrir Trust Wallet Cloud",
  ctaSecondary: "Saiba mais",
  statsUsers: "Autocustódia",
  statsUsersLabel: "primeiro",
  statsChainsLabel: "blockchains prontas",
  statsSelfCustodyLabel: "chaves nos nossos servidores",
  sectionDecentralizedTitle: "Feita para propriedade real",
  sectionDecentralizedBody:
    "Trust Wallet Cloud leva a experiência Trust mais longe: uma carteira descentralizada como PWA, com criptografia no seu dispositivo.",
  featureKeysTitle: "Suas chaves, sua crypto",
  featureKeysBody:
    "Nunca armazenamos sua seed phrase ou chaves privadas em nossos servidores.",
  featureCloudTitle: "Nuvem sem custódia",
  featureCloudBody:
    "Instale uma vez e abra em qualquer dispositivo. Sync criptografada sob o seu controle.",
  featureMultiTitle: "Uma plataforma, muitas redes",
  featureMultiBody:
    "Envie, receba, troque e descubra ativos — começando pela BNB Smart Chain.",
  privacyTitle: "Privacidade e segurança",
  privacyBody:
    "Você controla dados e ativos — sem que nós tenhamos as chaves.",
  privacyPoint1Title: "Criptografia no dispositivo",
  privacyPoint1Body: "Dados sensíveis são criptografados localmente.",
  privacyPoint2Title: "Sem custódia de chaves",
  privacyPoint2Body: "Só você autoriza transações.",
  privacyPoint3Title: "Acesse de qualquer lugar",
  privacyPoint3Body: "Use como PWA no celular ou desktop.",
  finalTitle: "Sua crypto. De verdade.",
  finalBody: "Abra a experiência Trust Wallet mais descentralizada.",
  finalCta: "Abrir carteira",
  footerRights: "Trust Wallet Cloud. Propriedade real da sua crypto.",
  footerWallet: "Ir para a carteira",
  language: "Idioma",
};

const fr: LandingCopy = {
  ...en,
  navWallet: "Portefeuille",
  navOpen: "Ouvrir",
  heroTitle: "La version la plus décentralisée du portefeuille",
  heroSubtitle:
    "Auto-conservation dans le cloud. Vos clés restent à vous — sans intermédiaire.",
  ctaPrimary: "Ouvrir Trust Wallet Cloud",
  ctaSecondary: "En savoir plus",
  statsUsers: "Auto-conservation",
  statsUsersLabel: "d’abord",
  statsChainsLabel: "blockchains prêtes",
  statsSelfCustodyLabel: "clés sur nos serveurs",
  sectionDecentralizedTitle: "Conçue pour une vraie propriété",
  sectionDecentralizedBody:
    "Trust Wallet Cloud pousse l’expérience Trust plus loin : un portefeuille décentralisé en PWA, chiffré sur votre appareil.",
  featureKeysTitle: "Vos clés, votre crypto",
  featureKeysBody:
    "Nous ne stockons jamais votre phrase secrète ni vos clés privées.",
  featureCloudTitle: "Cloud sans garde",
  featureCloudBody:
    "Installez une fois, ouvrez partout. Sync chiffrée sous votre contrôle.",
  featureMultiTitle: "Une plateforme, plusieurs chaînes",
  featureMultiBody:
    "Envoyez, recevez et échangez — à commencer par BNB Smart Chain.",
  privacyTitle: "Confidentialité et sécurité",
  privacyBody: "Vous gardez le contrôle — sans que nous ayons les clés.",
  privacyPoint1Title: "Chiffrement sur l’appareil",
  privacyPoint1Body: "Les données sensibles sont chiffrées localement.",
  privacyPoint2Title: "Pas de garde des clés",
  privacyPoint2Body: "Vous seul autorisez les transactions.",
  privacyPoint3Title: "Accessible partout",
  privacyPoint3Body: "Utilisez-la en PWA sur mobile et bureau.",
  finalTitle: "Votre crypto. Vraiment.",
  finalBody: "Ouvrez l’expérience Trust Wallet la plus décentralisée.",
  finalCta: "Lancer le portefeuille",
  footerRights: "Trust Wallet Cloud. Vraie propriété crypto.",
  footerWallet: "Aller au portefeuille",
  language: "Langue",
};

const de: LandingCopy = {
  ...en,
  navWallet: "Wallet",
  navOpen: "Öffnen",
  heroTitle: "Die dezentralste Version der Wallet",
  heroSubtitle:
    "Self-Custody in der Cloud. Deine Keys bleiben bei dir — ohne Zwischenhändler.",
  ctaPrimary: "Trust Wallet Cloud öffnen",
  ctaSecondary: "Mehr erfahren",
  statsUsers: "Self-Custody",
  statsUsersLabel: "zuerst",
  statsChainsLabel: "Blockchains bereit",
  statsSelfCustodyLabel: "Keys auf unseren Servern",
  sectionDecentralizedTitle: "Für echtes Eigentum gebaut",
  sectionDecentralizedBody:
    "Trust Wallet Cloud führt das Trust-Erlebnis weiter: eine dezentrale Wallet als PWA mit Verschlüsselung auf deinem Gerät.",
  featureKeysTitle: "Deine Keys, deine Crypto",
  featureKeysBody:
    "Wir speichern niemals deine Seed Phrase oder privaten Keys auf unseren Servern.",
  featureCloudTitle: "Cloud ohne Verwahrung",
  featureCloudBody:
    "Einmal installieren, überall öffnen. Verschlüsselte Sync unter deiner Kontrolle.",
  featureMultiTitle: "Eine Plattform, viele Chains",
  featureMultiBody:
    "Senden, empfangen und tauschen — beginnend mit BNB Smart Chain.",
  privacyTitle: "Privat und sicher",
  privacyBody: "Du behältst die Kontrolle — ohne dass wir die Keys halten.",
  privacyPoint1Title: "Verschlüsselung auf dem Gerät",
  privacyPoint1Body: "Sensible Daten werden lokal verschlüsselt.",
  privacyPoint2Title: "Keine Key-Verwahrung",
  privacyPoint2Body: "Nur du autorisierst Transaktionen.",
  privacyPoint3Title: "Überall öffnen",
  privacyPoint3Body: "Als PWA auf Mobil und Desktop.",
  finalTitle: "Deine Crypto. Wirklich deine.",
  finalBody: "Öffne das dezentralste Trust-Wallet-Erlebnis.",
  finalCta: "Wallet starten",
  footerRights: "Trust Wallet Cloud. Echtes Crypto-Eigentum.",
  footerWallet: "Zur Wallet",
  language: "Sprache",
};

const zh: LandingCopy = {
  ...en,
  navWallet: "钱包",
  navOpen: "打开钱包",
  heroTitle: "最去中心化的钱包版本",
  heroSubtitle: "云端自托管。密钥只属于你——没有中介保管你的加密资产。",
  ctaPrimary: "打开 Trust Wallet Cloud",
  ctaSecondary: "了解更多",
  statsUsers: "自托管",
  statsUsersLabel: "优先",
  statsChainsLabel: "条区块链就绪",
  statsSelfCustodyLabel: "密钥在我们的服务器上",
  sectionDecentralizedTitle: "为真正的所有权而生",
  sectionDecentralizedBody:
    "Trust Wallet Cloud 将 Trust 体验推向更远：作为 PWA 运行的去中心化钱包，设备端加密，只有你能解锁资产。",
  featureKeysTitle: "你的密钥，你的加密资产",
  featureKeysBody: "我们从不在服务器上存储助记词或私钥。",
  featureCloudTitle: "无托管的云",
  featureCloudBody: "安装一次，随处打开。加密同步由你掌控。",
  featureMultiTitle: "一个平台，多条链",
  featureMultiBody: "发送、接收与兑换——从 BNB Smart Chain 开始。",
  privacyTitle: "隐私与安全",
  privacyBody: "你掌控数据与资产——我们不持有密钥。",
  privacyPoint1Title: "设备端加密",
  privacyPoint1Body: "敏感数据在离开设备前本地加密。",
  privacyPoint2Title: "无密钥托管",
  privacyPoint2Body: "只有你能授权交易。",
  privacyPoint3Title: "随处可用",
  privacyPoint3Body: "作为 PWA 在手机与桌面使用。",
  finalTitle: "真正拥有你的加密资产",
  finalBody: "打开最去中心化的 Trust Wallet 体验。",
  finalCta: "启动钱包",
  footerRights: "Trust Wallet Cloud。真正的加密资产所有权。",
  footerWallet: "前往钱包",
  language: "语言",
};

const ja: LandingCopy = {
  ...en,
  navWallet: "ウォレット",
  navOpen: "開く",
  heroTitle: "最も分散型のウォレット",
  heroSubtitle:
    "クラウドでセルフカストディ。鍵はあなたのもの——仲介者が資産を預かりません。",
  ctaPrimary: "Trust Wallet Cloud を開く",
  ctaSecondary: "詳しく見る",
  statsUsers: "セルフカストディ",
  statsUsersLabel: "優先",
  statsChainsLabel: "ブロックチェーン対応",
  statsSelfCustodyLabel: "サーバー上の鍵",
  sectionDecentralizedTitle: "本当の所有のために",
  sectionDecentralizedBody:
    "Trust Wallet Cloud は Trust 体験をさらに進めます。端末で暗号化される分散型 PWA ウォレットです。",
  featureKeysTitle: "鍵も暗号資産もあなたのもの",
  featureKeysBody: "シードフレーズや秘密鍵をサーバーに保存しません。",
  featureCloudTitle: "カストディなしのクラウド",
  featureCloudBody: "一度インストールすればどこでも。暗号化同期はあなたが制御。",
  featureMultiTitle: "一つのプラットフォーム、多数のチェーン",
  featureMultiBody: "送受信とスワップ——BNB Smart Chain から。",
  privacyTitle: "プライバシーとセキュリティ",
  privacyBody: "データと資産の制御はあなたに——鍵は私たちが持ちません。",
  privacyPoint1Title: "端末側の暗号化",
  privacyPoint1Body: "機微なデータは端末で暗号化されます。",
  privacyPoint2Title: "鍵のカストディなし",
  privacyPoint2Body: "取引を承認するのはあなただけです。",
  privacyPoint3Title: "どこからでも",
  privacyPoint3Body: "PWA としてモバイルとデスクトップで利用。",
  finalTitle: "暗号資産を本当に所有する",
  finalBody: "最も分散型の Trust Wallet 体験を開く。",
  finalCta: "ウォレットを起動",
  footerRights: "Trust Wallet Cloud。真の暗号資産所有。",
  footerWallet: "ウォレットへ",
  language: "言語",
};

const ko: LandingCopy = {
  ...en,
  navWallet: "지갑",
  navOpen: "열기",
  heroTitle: "가장 탈중앙화된 지갑 버전",
  heroSubtitle:
    "클라우드 셀프 커스터디. 키는 당신 것 — 중개자가 자산을 보관하지 않습니다.",
  ctaPrimary: "Trust Wallet Cloud 열기",
  ctaSecondary: "더 알아보기",
  statsUsers: "셀프 커스터디",
  statsUsersLabel: "우선",
  statsChainsLabel: "블록체인 준비",
  statsSelfCustodyLabel: "서버의 키",
  sectionDecentralizedTitle: "진짜 소유권을 위해",
  sectionDecentralizedBody:
    "Trust Wallet Cloud는 Trust 경험을 더 멀리 가져갑니다. 기기에서 암호화되는 탈중앙 PWA 지갑입니다.",
  featureKeysTitle: "당신의 키, 당신의 암호화폐",
  featureKeysBody: "시드 구문이나 개인 키를 서버에 저장하지 않습니다.",
  featureCloudTitle: "커스터디 없는 클라우드",
  featureCloudBody: "한 번 설치하고 어디서나 엽니다. 암호화된 동기화는 당신이 통제합니다.",
  featureMultiTitle: "하나의 플랫폼, 여러 체인",
  featureMultiBody: "송금, 수신, 스왑 — BNB Smart Chain부터.",
  privacyTitle: "프라이버시와 보안",
  privacyBody: "데이터와 자산은 당신이 통제 — 키는 우리가 갖지 않습니다.",
  privacyPoint1Title: "기기 측 암호화",
  privacyPoint1Body: "민감한 데이터는 로컬에서 암호화됩니다.",
  privacyPoint2Title: "키 커스터디 없음",
  privacyPoint2Body: "거래 승인은 당신만 합니다.",
  privacyPoint3Title: "어디서나 열기",
  privacyPoint3Body: "모바일과 데스크톱에서 PWA로 사용.",
  finalTitle: "암호화폐를 진정으로 소유하세요",
  finalBody: "가장 탈중앙화된 Trust Wallet 경험을 엽니다.",
  finalCta: "지갑 실행",
  footerRights: "Trust Wallet Cloud. 진정한 암호화폐 소유권.",
  footerWallet: "지갑으로",
  language: "언어",
};

const ru: LandingCopy = {
  ...en,
  navWallet: "Кошелёк",
  navOpen: "Открыть",
  heroTitle: "Самая децентрализованная версия кошелька",
  heroSubtitle:
    "Самостоятельное хранение в облаке. Ключи остаются у вас — без посредников.",
  ctaPrimary: "Открыть Trust Wallet Cloud",
  ctaSecondary: "Подробнее",
  statsUsers: "Самохранение",
  statsUsersLabel: "прежде всего",
  statsChainsLabel: "блокчейнов готовы",
  statsSelfCustodyLabel: "ключей на наших серверах",
  sectionDecentralizedTitle: "Создано для настоящего владения",
  sectionDecentralizedBody:
    "Trust Wallet Cloud развивает опыт Trust: децентрализованный кошелёк как PWA с шифрованием на вашем устройстве.",
  featureKeysTitle: "Ваши ключи, ваша крипта",
  featureKeysBody:
    "Мы никогда не храним seed-фразу или приватные ключи на наших серверах.",
  featureCloudTitle: "Облако без кастодии",
  featureCloudBody:
    "Установите один раз и открывайте где угодно. Зашифрованная синхронизация под вашим контролем.",
  featureMultiTitle: "Одна платформа, много сетей",
  featureMultiBody:
    "Отправляйте, получайте и обменивайте — начиная с BNB Smart Chain.",
  privacyTitle: "Конфиденциальность и безопасность",
  privacyBody: "Вы контролируете данные и активы — без наших ключей.",
  privacyPoint1Title: "Шифрование на устройстве",
  privacyPoint1Body: "Чувствительные данные шифруются локально.",
  privacyPoint2Title: "Без хранения ключей",
  privacyPoint2Body: "Только вы подтверждаете транзакции.",
  privacyPoint3Title: "Открывайте где угодно",
  privacyPoint3Body: "Используйте как PWA на мобильном и десктопе.",
  finalTitle: "Ваша крипта. По-настоящему.",
  finalBody: "Откройте самый децентрализованный опыт Trust Wallet.",
  finalCta: "Запустить кошелёк",
  footerRights: "Trust Wallet Cloud. Настоящее владение криптой.",
  footerWallet: "К кошельку",
  language: "Язык",
};

const tr: LandingCopy = {
  ...en,
  navWallet: "Cüzdan",
  navOpen: "Aç",
  heroTitle: "Cüzdanın en merkeziyetsiz sürümü",
  heroSubtitle:
    "Bulutta kendi muhafazanız. Anahtarlarınız sizde — aracı yok.",
  ctaPrimary: "Trust Wallet Cloud’u aç",
  ctaSecondary: "Daha fazla",
  statsUsers: "Kendi muhafaza",
  statsUsersLabel: "önce",
  statsChainsLabel: "blockchain hazır",
  statsSelfCustodyLabel: "sunucularımızdaki anahtar",
  sectionDecentralizedTitle: "Gerçek sahiplik için",
  sectionDecentralizedBody:
    "Trust Wallet Cloud, Trust deneyimini daha ileri taşır: cihazınızda şifrelenen merkeziyetsiz bir PWA cüzdan.",
  featureKeysTitle: "Anahtarlarınız, kriptonuz",
  featureKeysBody:
    "Seed ifadenizi veya özel anahtarlarınızı sunucularımızda saklamayız.",
  featureCloudTitle: "Muhafazasız bulut",
  featureCloudBody:
    "Bir kez kurun, her yerden açın. Şifreli senkronizasyon sizin kontrolünüzde.",
  featureMultiTitle: "Tek platform, çok zincir",
  featureMultiBody:
    "Gönderin, alın, takas edin — BNB Smart Chain ile başlayarak.",
  privacyTitle: "Gizlilik ve güvenlik",
  privacyBody: "Veri ve varlıklar sizin kontrolünüzde — anahtarlar bizde değil.",
  privacyPoint1Title: "Cihazda şifreleme",
  privacyPoint1Body: "Hassas veriler yerel olarak şifrelenir.",
  privacyPoint2Title: "Anahtar muhafazası yok",
  privacyPoint2Body: "İşlemleri yalnızca siz onaylarsınız.",
  privacyPoint3Title: "Her yerden açın",
  privacyPoint3Body: "Mobil ve masaüstünde PWA olarak kullanın.",
  finalTitle: "Kriptonuz. Gerçekten sizin.",
  finalBody: "En merkeziyetsiz Trust Wallet deneyimini açın.",
  finalCta: "Cüzdanı başlat",
  footerRights: "Trust Wallet Cloud. Gerçek kripto sahipliği.",
  footerWallet: "Cüzdana git",
  language: "Dil",
};

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = {
  en,
  es,
  pt,
  fr,
  de,
  zh,
  ja,
  ko,
  ru,
  tr,
};

const STORAGE_KEY = "twc-landing-locale";

export function detectLandingLocale(): LandingLocale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY) as LandingLocale | null;
  if (saved && saved in LANDING_COPY) return saved;

  const nav = navigator.language.slice(0, 2).toLowerCase();
  const match = LANDING_LOCALES.find((l) => l.code === nav);
  return match?.code ?? "en";
}

export function persistLandingLocale(locale: LandingLocale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}
