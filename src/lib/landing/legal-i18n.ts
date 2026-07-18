import type { LandingLocale } from "./i18n";

export type LegalPageId = "privacy" | "cookies";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalCopy = {
  title: string;
  updated: string;
  back: string;
  sections: LegalSection[];
};

const privacyEn: LegalCopy = {
  title: "Privacy Policy",
  updated: "Last updated: July 2026",
  back: "Back to home",
  sections: [
    {
      title: "Overview",
      paragraphs: [
        "Trust Wallet Cloud is a self-custody wallet offered as a progressive web app. We are designed so you remain in control of your keys, seed phrase and digital assets.",
        "This policy explains what information we process, why we process it, and the choices you have.",
      ],
    },
    {
      title: "What we do not collect",
      paragraphs: [
        "We do not store your seed phrase, private keys or wallet passwords on our servers. We cannot access or move your funds on your behalf.",
        "We do not sell personal data. We do not use your wallet balances for advertising profiles.",
      ],
    },
    {
      title: "Information processed locally",
      paragraphs: [
        "Wallet data such as encrypted vault material, settings and locale preferences may be stored in your browser or on your device. This data is intended to stay under your control.",
        "When you use blockchain features, transactions are broadcast to public networks. Addresses and on-chain activity are visible on those networks by design.",
      ],
    },
    {
      title: "Service data",
      paragraphs: [
        "If you use cloud-backed features tied to this product, we may process technical logs, device/browser metadata and wallet addresses you choose to register for service functionality. We use this data to operate, secure and improve the service.",
        "We may retain server logs for a limited period for security, abuse prevention and debugging.",
      ],
    },
    {
      title: "Your choices",
      paragraphs: [
        "You can clear site data from your browser at any time. Removing local storage may require you to import your wallet again using your recovery phrase.",
        "You can change language preferences in the landing page selector. Cookie consent is stored locally and can be cleared from your browser settings.",
      ],
    },
    {
      title: "Contact",
      paragraphs: [
        "For privacy questions about Trust Wallet Cloud, contact us through the support channels published on trustwalletcloud.com.",
      ],
    },
  ],
};

const privacyEs: LegalCopy = {
  title: "Política de privacidad",
  updated: "Última actualización: julio de 2026",
  back: "Volver al inicio",
  sections: [
    {
      title: "Resumen",
      paragraphs: [
        "Trust Wallet Cloud es una billetera de autocustodia ofrecida como aplicación web progresiva (PWA). Está diseñada para que mantengas el control de tus claves, frase semilla y activos digitales.",
        "Esta política explica qué información tratamos, por qué lo hacemos y qué opciones tienes.",
      ],
    },
    {
      title: "Lo que no recopilamos",
      paragraphs: [
        "No almacenamos tu frase semilla, claves privadas ni contraseñas de la wallet en nuestros servidores. No podemos acceder ni mover tus fondos por ti.",
        "No vendemos datos personales. No usamos tus saldos de wallet para crear perfiles publicitarios.",
      ],
    },
    {
      title: "Información procesada en local",
      paragraphs: [
        "Datos de la wallet como material cifrado del vault, ajustes y preferencias de idioma pueden guardarse en tu navegador o dispositivo. Estos datos están pensados para permanecer bajo tu control.",
        "Cuando usas funciones blockchain, las transacciones se emiten a redes públicas. Las direcciones y la actividad on-chain son visibles en esas redes por diseño.",
      ],
    },
    {
      title: "Datos del servicio",
      paragraphs: [
        "Si usas funciones con backend asociadas a este producto, podemos tratar registros técnicos, metadatos del dispositivo/navegador y direcciones de wallet que decidas registrar para el funcionamiento del servicio. Usamos estos datos para operar, proteger y mejorar el servicio.",
        "Podemos conservar logs del servidor durante un periodo limitado por seguridad, prevención de abuso y depuración.",
      ],
    },
    {
      title: "Tus opciones",
      paragraphs: [
        "Puedes borrar los datos del sitio desde tu navegador en cualquier momento. Eliminar el almacenamiento local puede requerir que importes de nuevo tu wallet con tu frase de recuperación.",
        "Puedes cambiar el idioma desde el selector de la landing. El consentimiento de cookies se guarda en local y puedes borrarlo desde la configuración del navegador.",
      ],
    },
    {
      title: "Contacto",
      paragraphs: [
        "Para consultas de privacidad sobre Trust Wallet Cloud, contáctanos a través de los canales de soporte publicados en trustwalletcloud.com.",
      ],
    },
  ],
};

const cookiesEn: LegalCopy = {
  title: "Cookie Notice",
  updated: "Last updated: July 2026",
  back: "Back to home",
  sections: [
    {
      title: "What are cookies?",
      paragraphs: [
        "Cookies and similar technologies are small pieces of data stored in your browser. We use them only where needed to remember preferences and keep the site working as expected.",
      ],
    },
    {
      title: "Cookies we use",
      paragraphs: [
        "Essential / preference storage: we store your cookie consent choice and, if you select one, your landing page language. These items are saved in local storage so we do not ask you again on every visit.",
        "Wallet application storage: when you open /wallet, additional local storage may be used to keep encrypted wallet data and app settings on your device.",
      ],
    },
    {
      title: "Third-party cookies",
      paragraphs: [
        "Trust Wallet Cloud does not set advertising cookies on the landing page. Third-party services involved in blockchain RPC, pricing or backend APIs may process technical requests when you use wallet features.",
      ],
    },
    {
      title: "Managing cookies",
      paragraphs: [
        "You can remove stored data at any time through your browser settings. If you clear storage, you may need to accept cookies again and reconfigure wallet or language preferences.",
        "By clicking Accept on the cookie banner, you consent to the use of essential storage described in this notice.",
      ],
    },
  ],
};

const cookiesEs: LegalCopy = {
  title: "Aviso de cookies",
  updated: "Última actualización: julio de 2026",
  back: "Volver al inicio",
  sections: [
    {
      title: "Qué son las cookies",
      paragraphs: [
        "Las cookies y tecnologías similares son pequeños datos guardados en tu navegador. Las usamos solo cuando es necesario para recordar preferencias y mantener el sitio funcionando correctamente.",
      ],
    },
    {
      title: "Cookies que usamos",
      paragraphs: [
        "Esenciales / preferencias: guardamos tu elección de consentimiento de cookies y, si la eliges, el idioma de la landing. Se almacenan en local storage para no preguntarte en cada visita.",
        "Almacenamiento de la wallet: al abrir /wallet, puede usarse almacenamiento local adicional para mantener datos cifrados de la wallet y ajustes de la app en tu dispositivo.",
      ],
    },
    {
      title: "Cookies de terceros",
      paragraphs: [
        "Trust Wallet Cloud no instala cookies publicitarias en la landing. Servicios de terceros relacionados con RPC blockchain, precios o APIs de backend pueden procesar peticiones técnicas cuando usas funciones de la wallet.",
      ],
    },
    {
      title: "Gestionar cookies",
      paragraphs: [
        "Puedes eliminar los datos almacenados en cualquier momento desde la configuración de tu navegador. Si borras el almacenamiento, puede que tengas que aceptar cookies de nuevo y reconfigurar preferencias de wallet o idioma.",
        "Al pulsar Aceptar en el banner de cookies, consientes el uso del almacenamiento esencial descrito en este aviso.",
      ],
    },
  ],
};

const LEGAL: Record<LegalPageId, Record<LandingLocale, LegalCopy>> = {
  privacy: {
    en: privacyEn,
    es: privacyEs,
    pt: privacyEn,
    fr: privacyEn,
    de: privacyEn,
    zh: privacyEn,
    ja: privacyEn,
    ko: privacyEn,
    ru: privacyEn,
    tr: privacyEn,
  },
  cookies: {
    en: cookiesEn,
    es: cookiesEs,
    pt: cookiesEn,
    fr: cookiesEn,
    de: cookiesEn,
    zh: cookiesEn,
    ja: cookiesEn,
    ko: cookiesEn,
    ru: cookiesEn,
    tr: cookiesEn,
  },
};

export function getLegalCopy(
  page: LegalPageId,
  locale: LandingLocale
): LegalCopy {
  return LEGAL[page][locale] ?? LEGAL[page].en;
}
