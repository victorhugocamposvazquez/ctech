import type { LandingLocale } from "./i18n";

export type AboutValue = {
  title: string;
  body: string;
};

export type AboutMilestone = {
  title: string;
  body: string;
};

export type AboutCopy = {
  heroTitle: string;
  heroBody: string;
  heroCta: string;
  purposeLabel: string;
  purposeTitle: string;
  purposeBody: string;
  visionLabel: string;
  visionTitle: string;
  visionBody: string;
  missionLabel: string;
  missionTitle: string;
  missionBody: string;
  journeyTitle: string;
  milestones: AboutMilestone[];
  valuesTitle: string;
  values: AboutValue[];
  teamTitle: string;
  teamBody: string;
  teamCta: string;
};

const en: AboutCopy = {
  heroTitle:
    "We make Web3 access simpler and more secure — without giving up your keys",
  heroBody:
    "Trust Wallet Cloud is the most decentralized version of the wallet: self-custody as a progressive web app, so you can explore Web3 with true ownership.",
  heroCta: "Explore Trust Wallet Cloud",
  purposeLabel: "Our purpose",
  purposeTitle: "Foundations of freedom",
  purposeBody:
    "We want everyone to have the freedom of true ownership — laying the groundwork for a freer web, where your assets stay under your control.",
  visionLabel: "Our vision",
  visionTitle: "Give people the freedom to control their assets",
  visionBody:
    "Participate with confidence in the on-chain economy and access opportunities that improve people’s lives — without surrendering custody.",
  missionLabel: "Our mission",
  missionTitle: "Become a personal companion",
  missionBody:
    "Support users as they explore Web3 and the on-chain economy — with encryption on their device and a wallet that never holds their keys.",
  journeyTitle: "Join us as we empower people through Trust Wallet Cloud",
  milestones: [
    {
      title: "Built for self-custody",
      body: "Our journey starts with a clear goal: make crypto ownership accessible without a custodian in the middle.",
    },
    {
      title: "Decentralized by design",
      body: "We earn trust by keeping seed phrases and private keys off our servers — only you unlock and authorize.",
    },
    {
      title: "And we don’t stop there",
      body: "We’re laying the foundations so more people can enter on-chain safely — from any device, as a PWA.",
    },
  ],
  valuesTitle: "Our values",
  values: [
    {
      title: "User-centered",
      body: "We obsess over user problems and constantly look for better solutions.",
    },
    {
      title: "Ownership & responsibility",
      body: "We pursue results with determination, passion and commitment — and we never take custody of your keys.",
    },
    {
      title: "Open & collaborative",
      body: "We want to be a trusted gateway for decentralized Web3 experiences.",
    },
    {
      title: "Humble growth mindset",
      body: "We stay curious, open and flexible. We don’t expect or guarantee perfection.",
    },
    {
      title: "Integrity",
      body: "Do no harm, act with conscience and inspire trust by holding a high standard in everything we build.",
    },
    {
      title: "Execution-oriented",
      body: "We lean into action. Done is better than perfect — especially when ownership is on the line.",
    },
  ],
  teamTitle: "A passionate team of Web3 builders",
  teamBody:
    "Like the products we build, our approach is decentralized: ship a wallet you control, open it anywhere, and keep the chain as the source of truth.",
  teamCta: "Open the wallet",
};

const es: AboutCopy = {
  heroTitle:
    "Facilitamos y hacemos más seguro el acceso a Web3 — sin renunciar a tus claves",
  heroBody:
    "Trust Wallet Cloud es la versión más descentralizada de la billetera: autocustodia como PWA, para que explores Web3 con titularidad real.",
  heroCta: "Explorar Trust Wallet Cloud",
  purposeLabel: "Nuestro propósito",
  purposeTitle: "Fundamentos de la libertad",
  purposeBody:
    "Queremos ofrecer a todos la libertad de ser propietarios de verdad, sentando los cimientos para el futuro de una web libre — donde tus activos queden bajo tu control.",
  visionLabel: "Nuestra visión",
  visionTitle: "Dar a las personas la libertad de controlar la propiedad de sus activos",
  visionBody:
    "Participar con confianza en la economía on-chain y acceder a oportunidades que mejoren sus vidas — sin ceder la custodia.",
  missionLabel: "Nuestra misión",
  missionTitle: "Convertirnos en un acompañante personal",
  missionBody:
    "Apoyar a los usuarios mientras exploran la Web3 y la economía en cadena — con cifrado en su dispositivo y una wallet que nunca guarda sus claves.",
  journeyTitle:
    "Únete a nosotros mientras empoderamos a las personas a través de Trust Wallet Cloud",
  milestones: [
    {
      title: "Hecha para la autocustodia",
      body: "Nuestro viaje empieza con un objetivo claro: simplificar y democratizar la propiedad crypto sin un custodio en medio.",
    },
    {
      title: "Descentralizada por diseño",
      body: "Ganamos confianza manteniendo frases semilla y claves privadas fuera de nuestros servidores — solo tú desbloqueas y autorizas.",
    },
    {
      title: "Pero no nos detenemos ahí",
      body: "Estamos sentando las bases para que más personas entren on-chain de forma segura — desde cualquier dispositivo, como PWA.",
    },
  ],
  valuesTitle: "Nuestros valores",
  values: [
    {
      title: "Centrado en los usuarios",
      body: "Nos obsesionan los problemas de los usuarios y buscamos constantemente mejores soluciones.",
    },
    {
      title: "Titularidad y responsabilidad",
      body: "Perseguimos resultados con determinación, pasión y compromiso — y nunca custodiamos tus claves.",
    },
    {
      title: "Abierto y colaborativo",
      body: "Queremos convertirnos en un portal de confianza para experiencias Web3 descentralizadas.",
    },
    {
      title: "Mentalidad humilde y de crecimiento",
      body: "Somos curiosos, abiertos, humildes y flexibles. No esperamos ni garantizamos la perfección.",
    },
    {
      title: "Integridad",
      body: "No hacer el mal, actuar en conciencia e inspirar confianza manteniendo un alto nivel de exigencia en todo lo que construimos.",
    },
    {
      title: "Orientado a la ejecución",
      body: "Nos inclinamos por la acción. Lo hecho es mejor que lo perfecto — sobre todo cuando la propiedad está en juego.",
    },
  ],
  teamTitle: "Somos un equipo apasionado de creadores Web3",
  teamBody:
    "Como los productos que desarrollamos, nuestro enfoque es descentralizado: una wallet que controlas tú, abierta donde quieras, con la cadena como fuente de verdad.",
  teamCta: "Abrir la wallet",
};

const ABOUT_COPY: Record<LandingLocale, AboutCopy> = {
  en,
  es,
  pt: en,
  fr: en,
  de: en,
  zh: en,
  ja: en,
  ko: en,
  ru: en,
  tr: en,
};

export function getAboutCopy(locale: LandingLocale): AboutCopy {
  return ABOUT_COPY[locale] ?? en;
}
