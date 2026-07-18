import type { LandingLocale } from "./i18n";

export type LegalPageId = "privacy" | "cookies";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | { type: "h3"; text: string }
  | { type: "link"; href: string; label: string; prefix?: string };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalCopy = {
  title: string;
  updated: string;
  back: string;
  intro: string[];
  tocTitle: string;
  sections: LegalSection[];
};

const privacyEn: LegalCopy = {
  title: "Trust Wallet Cloud Privacy Notice",
  updated: "Last Updated: July 18, 2026",
  back: "Back to home",
  tocTitle: "Contents",
  intro: [
    'This Privacy Notice (“Notice”) describes how Trust Wallet Cloud (“Trust Wallet Cloud”, “we”, “us”, “our”) collects and processes your Personal Data (“you”, “your”) through our websites (including trustwalletcloud.com) and applications or other services (collectively, together with our websites and apps, our “Services”).',
    "Trust Wallet Cloud is a self-custody wallet offered primarily as a progressive web app (PWA). We design the Services so that seed phrases, private keys and wallet passwords remain under your control and are not stored on our servers.",
    "This Privacy Notice applies together with any terms of use, terms of business or other contractual documents we may publish, including agreements we may have with you. By using our Services or engaging with us, you acknowledge the collection, storage, processing and transfer of Personal Data as described in this Notice.",
  ],
  sections: [
    {
      id: "relationship",
      title: "1. Our Relationship with You",
      blocks: [
        {
          type: "p",
          text: "Your right to privacy and the protection of your Personal Data is important to us. Trust Wallet Cloud is committed to privacy best practices, and we only collect data when it is necessary to provide our Services.",
        },
        {
          type: "p",
          text: "By using Trust Wallet Cloud’s Services — for example visiting our website, opening the wallet PWA, interacting with support channels, or participating in community forums — you acknowledge and accept the use, disclosure and procedures outlined in this Privacy Notice.",
        },
        {
          type: "p",
          text: "The following sections explain how we process your Personal Data as Data Controller for Trust Wallet Cloud.",
        },
      ],
    },
    {
      id: "collection",
      title: "2. Collection and Use of Your Personal Data",
      blocks: [
        {
          type: "p",
          text: "“Personal Data” is information that may identify an individual or relates to an identifiable individual. This includes information you provide voluntarily, information collected or created automatically in the course of providing our Services, or information you share when you contact us. Following data-minimisation principles, we endeavour to collect only what is necessary to provide the Services.",
        },
        { type: "h3", text: "When you use our self-custody wallet" },
        {
          type: "p",
          text: "As a user of our wallet — whether in the browser or installed as a PWA — you can create or import wallet information that is stored locally on your device. We do not require an email address to create a self-custody wallet, and we do not store your seed phrase or private keys on our servers.",
        },
        {
          type: "table",
          headers: [
            "Category of Personal Data",
            "Types of Personal Data",
            "Purpose of processing & Legal Basis",
          ],
          rows: [
            [
              "Wallet Information",
              "Encrypted vault material, public wallet address, and related local settings. Wallet private keys / seed phrases remain stored locally on your device under your custody.",
              "To deliver self-custody wallet services and enable you to unlock, manage and use your wallet. Legal basis: performance of a contract.",
            ],
            [
              "Transaction Information",
              "Public blockchain data related to transactions you make or view — such as timestamps, public wallet addresses and amounts.",
              "To display balances/history and facilitate transactions you request. Legal basis: performance of a contract. On-chain data is public by design.",
            ],
            [
              "Device & Usage Information",
              "Device model, operating system, browser type, language setting, app/PWA installation information. IP address may be processed only on a transient basis for traffic routing / regulatory localisation and is not retained as a profile identifier.",
              "To deliver, secure and improve the Services and user experience. Legal basis: legitimate interests in operating and improving the Services.",
            ],
          ],
        },
        { type: "h3", text: "When you visit our website" },
        {
          type: "p",
          text: "When you use our website, request support or interact with campaigns, you may provide Personal Data. We do not ask for your seed phrase for these purposes.",
        },
        {
          type: "table",
          headers: [
            "Category of Personal Data",
            "Types of Personal Data",
            "Purpose of processing & Legal Basis",
          ],
          rows: [
            [
              "Contact Information",
              "Information you choose to provide when contacting us (for example an email address).",
              "To communicate with you for support and assistance. Legal basis: performance of a contract / legitimate interests.",
            ],
            [
              "Preference Information",
              "Language preference and cookie consent choice stored locally in your browser.",
              "To remember your preferences and respect your consent choices. Legal basis: consent and/or legitimate interests.",
            ],
            [
              "Device & Usage Information",
              "Browser type, language, time zone and similar technical data. IP may be processed transiently for routing and security.",
              "To deliver and enhance the website experience and protect the Services. Legal basis: legitimate interests.",
            ],
          ],
        },
        { type: "h3", text: "Biometric authentication (optional)" },
        {
          type: "p",
          text: "Where available on your device, you may enable biometric unlock (for example Face ID or fingerprint) as a convenient way to unlock the local wallet vault. Biometric data is processed by your device’s operating system security features and is not transmitted to our servers.",
        },
        { type: "h3", text: "Personal Data collected automatically" },
        {
          type: "p",
          text: "In certain circumstances we may collect device, log and usage data automatically when you use our Services, in accordance with applicable laws. This helps us enhance your experience, provide support, improve performance, detect abuse and protect the Services.",
        },
        {
          type: "note",
          text: "IP addresses may be processed briefly for traffic routing, localisation for regulatory compliance, and establishing secure connections with third-party platforms you choose to use. We do not retain IP addresses to build advertising profiles.",
        },
        { type: "h3", text: "Aggregated and anonymized data" },
        {
          type: "p",
          text: "We may use aggregated or anonymized data to improve our Services — for example analysing general usage trends without identifying individuals. Such data may be shared with trusted providers or partners for analytics, security or business development, without revealing Personal Data.",
        },
      ],
    },
    {
      id: "cookies",
      title: "3. Use of Cookies",
      blocks: [
        {
          type: "p",
          text: "We use cookies and similar technologies (including local storage) to enhance your experience, provide the Services, remember preferences and understand how the Services are used. Depending on applicable law, our cookie banner will ask you to accept essential storage. Please read our Cookie Notice for full details.",
        },
        {
          type: "link",
          href: "/cookies",
          label: "Cookie Notice",
          prefix: "See also: ",
        },
      ],
    },
    {
      id: "sharing",
      title: "4. How and Why We Share Your Data",
      blocks: [
        {
          type: "p",
          text: "Information about our users is an important part of our business, and we are not in the business of selling Personal Data. We may transfer Personal Data to service providers or third parties in connection with operating Trust Wallet Cloud, as certain features rely on third-party products and services (collectively “Third Party Services”), such as hosting, cloud infrastructure, RPC/network providers, pricing data, analytics (if enabled) and maintenance.",
        },
        {
          type: "p",
          text: "Third-party providers only receive the Personal Data needed to perform their functions (for example public wallet addresses for on-chain queries) and may not use it for other purposes. They must process Personal Data in accordance with our contracts and applicable data-protection laws.",
        },
        {
          type: "ul",
          items: [
            "Business transfers: if we sell, buy or reorganise businesses or assets, user information may be among the transferred assets, remaining subject to the promises in any pre-existing Privacy Notice unless you consent otherwise.",
            "Legal authorities: we may disclose Personal Data when required by law, court order or competent authority, or to enforce our rights and prevent fraud.",
            "Protection of us and others: we may share information when we reasonably believe it is necessary to comply with law, cooperate with law enforcement, enforce our terms, or protect the rights, property or safety of Trust Wallet Cloud, our users or others.",
          ],
        },
        {
          type: "p",
          text: "Our Services may contain links to third-party websites, dApps and platforms (“Third Party Platforms”). Those platforms act as independent controllers; their processing is governed by their own privacy policies, not this Notice.",
        },
      ],
    },
    {
      id: "transfers",
      title: "5. International Transfer of Personal Data",
      blocks: [
        {
          type: "p",
          text: "We may use servers hosted by trusted service providers, and your information may be processed on servers located outside your country of residence. We may also transfer Personal Data to affiliates, partners and providers in other countries.",
        },
        {
          type: "p",
          text: "Where we transfer Personal Data internationally, we implement appropriate technical, organisational and contractual safeguards — which may include Standard Contractual Clauses — to ensure an adequate level of protection as required by applicable law.",
        },
      ],
    },
    {
      id: "security",
      title: "6. Data Security",
      blocks: [
        {
          type: "p",
          text: "Information security is a crucial component of privacy. Although no transmission over the Internet can be guaranteed entirely secure, we employ commercially reasonable physical, technical and organisational measures to protect Personal Data from unauthorised access, use, disclosure, alteration or destruction.",
        },
        {
          type: "p",
          text: "If you are a self-custody wallet user, remember that your seed phrase / private keys are stored locally on your device under your control. Enable device passcodes and wallet unlock protection, and never share your recovery phrase with anyone — including anyone claiming to represent Trust Wallet Cloud.",
        },
        {
          type: "note",
          text: "We reference industry security and privacy management practices aligned with standards such as ISO/IEC 27001 and ISO/IEC 27701 where applicable to our operations and certifications displayed on our site.",
        },
      ],
    },
    {
      id: "retention",
      title: "7. Data Retention",
      blocks: [
        {
          type: "p",
          text: "We keep Personal Data for as long as needed to provide the Services, fulfil the purposes described in this Notice, comply with legal obligations (for example tax or accounting), resolve disputes, or as otherwise communicated to you.",
        },
        {
          type: "p",
          text: "When we no longer have a legitimate business or legal need to retain Personal Data, we delete or anonymise it — or, if deletion is not immediately possible (for example backups), we securely isolate it until deletion is possible.",
        },
        {
          type: "note",
          text: "Even if you clear local wallet data, uninstall the PWA, or request deletion, blockchain networks are public and decentralised. On-chain records generally cannot be erased, so the right to erasure may not be fully enforceable for blockchain data.",
        },
      ],
    },
    {
      id: "rights",
      title: "8. What Privacy Rights Do You Have?",
      blocks: [
        {
          type: "p",
          text: "Subject to applicable law, you may have rights in relation to your Personal Data. These rights may be limited in some situations — for example where we have a legal obligation to retain data.",
        },
        {
          type: "ol",
          items: [
            "Right to access: obtain a copy of Personal Data we hold about you and information about its processing.",
            "Right to correct: request rectification of inaccurate Personal Data or completion of incomplete records.",
            "Right to erase: request erasure where Personal Data is no longer necessary for the purposes collected (subject to legal exceptions).",
            "Right to object: object to processing based on legitimate interests or for direct marketing.",
            "Right to restrict processing: request temporary restriction of processing in certain cases.",
            "Right to withdraw consent: where processing is based on consent, withdraw it at any time without affecting prior lawful processing.",
            "Right to portability: request Personal Data in a structured, commonly used format where technically feasible.",
          ],
        },
        {
          type: "p",
          text: "To exercise your rights, contact us using the details in Section 11. We will respond as quickly as practicable and explain if we cannot fulfil a request (unless prohibited by law).",
        },
      ],
    },
    {
      id: "children",
      title: "9. Children",
      blocks: [
        {
          type: "p",
          text: "Our Services are not directed to children. Users must be at least eighteen (18) years old. We do not knowingly solicit data from or market to persons under 18. By using the Services, you represent that you are at least 18. If we become aware that we collected Personal Data from someone under 18, we will take reasonable steps to delete it unless legally required to keep it.",
        },
      ],
    },
    {
      id: "revisions",
      title: "10. Conditions of Use, Notices and Revisions",
      blocks: [
        {
          type: "p",
          text: "If you choose to use our Services, your use and any dispute over privacy is subject to this Privacy Notice and any applicable Terms of Use. You also have the right to contact your local Data Protection Authority.",
        },
        {
          type: "p",
          text: "We may update this Notice from time to time. When we do, we will revise the “Last Updated” date at the top of this page. Please review this Notice regularly. Continued use of the Services after an update constitutes acceptance of the revised terms, where permitted by law.",
        },
      ],
    },
    {
      id: "contact",
      title: "11. Privacy Team Contact Information",
      blocks: [
        {
          type: "p",
          text: "For privacy-related questions about Trust Wallet Cloud, contact us through the support channels published on trustwalletcloud.com. Please note that privacy channels may not be able to handle general product-support requests.",
        },
        {
          type: "p",
          text: "Thanks for reading our Privacy Notice.",
        },
      ],
    },
  ],
};

const privacyEs: LegalCopy = {
  title: "Aviso de privacidad de Trust Wallet Cloud",
  updated: "Última actualización: 18 de julio de 2026",
  back: "Volver al inicio",
  tocTitle: "Contenido",
  intro: [
    "Este Aviso de privacidad (“Aviso”) describe cómo Trust Wallet Cloud (“Trust Wallet Cloud”, “nosotros”, “nuestro”) recopila y trata tus Datos Personales (“tú”, “tu”) a través de nuestros sitios web (incluido trustwalletcloud.com) y aplicaciones u otros servicios (conjuntamente, nuestros “Servicios”).",
    "Trust Wallet Cloud es una billetera de autocustodia ofrecida principalmente como aplicación web progresiva (PWA). Diseñamos los Servicios para que las frases semilla, claves privadas y contraseñas de la wallet permanezcan bajo tu control y no se almacenen en nuestros servidores.",
    "Este Aviso se aplica junto con cualquier término de uso u otros documentos contractuales que publiquemos. Al usar nuestros Servicios o interactuar con nosotros, reconoces la recopilación, almacenamiento, tratamiento y transferencia de Datos Personales según se describe en este Aviso.",
  ],
  sections: [
    {
      id: "relationship",
      title: "1. Nuestra relación contigo",
      blocks: [
        {
          type: "p",
          text: "Tu derecho a la privacidad y a la protección de tus Datos Personales es importante para nosotros. Trust Wallet Cloud se compromete con las mejores prácticas de privacidad y solo recoge datos cuando es necesario para prestar los Servicios.",
        },
        {
          type: "p",
          text: "Al usar los Servicios de Trust Wallet Cloud — por ejemplo visitar nuestro sitio, abrir la wallet PWA, contactar con soporte o participar en foros — reconoces y aceptas el uso, la divulgación y los procedimientos descritos en este Aviso.",
        },
        {
          type: "p",
          text: "Las siguientes secciones detallan cómo tratamos tus Datos Personales como Responsable del tratamiento de Trust Wallet Cloud.",
        },
      ],
    },
    {
      id: "collection",
      title: "2. Recopilación y uso de tus Datos Personales",
      blocks: [
        {
          type: "p",
          text: "“Datos Personales” es la información que puede identificar a una persona o se refiere a una persona identificable. Incluye datos que nos facilitas voluntariamente, datos recogidos o generados automáticamente al prestar los Servicios, o información que compartes al contactarnos. Siguiendo el principio de minimización, intentamos recoger solo lo necesario.",
        },
        { type: "h3", text: "Cuando usas nuestra billetera de autocustodia" },
        {
          type: "p",
          text: "Como usuario de la wallet — en el navegador o instalada como PWA — puedes crear o importar información de wallet que se almacena en local en tu dispositivo. No exigimos un email para crear una wallet de autocustodia y no guardamos tu frase semilla ni claves privadas en nuestros servidores.",
        },
        {
          type: "table",
          headers: [
            "Categoría de Datos Personales",
            "Tipos de Datos Personales",
            "Finalidad del tratamiento y base jurídica",
          ],
          rows: [
            [
              "Información de la wallet",
              "Material cifrado del vault, dirección pública y ajustes locales. Las claves privadas / frase semilla permanecen en tu dispositivo bajo tu custodia.",
              "Prestar servicios de billetera de autocustodia y permitir desbloquear, gestionar y usar la wallet. Base jurídica: ejecución de un contrato.",
            ],
            [
              "Información de transacciones",
              "Datos públicos de blockchain relacionados con transacciones que realizas o consultas — marcas de tiempo, direcciones públicas e importes.",
              "Mostrar saldos/historial y facilitar las transacciones que solicitas. Base jurídica: ejecución de un contrato. Los datos on-chain son públicos por diseño.",
            ],
            [
              "Información del dispositivo y uso",
              "Modelo de dispositivo, sistema operativo, tipo de navegador, idioma, información de instalación de la PWA. La IP puede tratarse de forma transitoria para enrutado / localización regulatoria y no se retiene como identificador de perfil.",
              "Prestar, proteger y mejorar los Servicios y la experiencia de usuario. Base jurídica: intereses legítimos.",
            ],
          ],
        },
        { type: "h3", text: "Cuando visitas nuestro sitio web" },
        {
          type: "p",
          text: "Cuando usas el sitio, solicitas soporte o interactúas con campañas, puedes facilitar Datos Personales. No pedimos tu frase semilla para estos fines.",
        },
        {
          type: "table",
          headers: [
            "Categoría de Datos Personales",
            "Tipos de Datos Personales",
            "Finalidad del tratamiento y base jurídica",
          ],
          rows: [
            [
              "Datos de contacto",
              "Información que eliges facilitar al contactarnos (por ejemplo un email).",
              "Comunicarnos contigo para soporte y asistencia. Base jurídica: ejecución de un contrato / intereses legítimos.",
            ],
            [
              "Preferencias",
              "Idioma y consentimiento de cookies guardados en local en tu navegador.",
              "Recordar preferencias y respetar tus elecciones de consentimiento. Base jurídica: consentimiento y/o intereses legítimos.",
            ],
            [
              "Información del dispositivo y uso",
              "Tipo de navegador, idioma, zona horaria y datos técnicos similares. La IP puede tratarse de forma transitoria por enrutado y seguridad.",
              "Prestar y mejorar la experiencia del sitio y proteger los Servicios. Base jurídica: intereses legítimos.",
            ],
          ],
        },
        { type: "h3", text: "Autenticación biométrica (opcional)" },
        {
          type: "p",
          text: "Cuando tu dispositivo lo permita, puedes activar el desbloqueo biométrico (Face ID o huella) para desbloquear el vault local. Los datos biométricos los procesa el sistema operativo del dispositivo y no se transmiten a nuestros servidores.",
        },
        { type: "h3", text: "Datos Personales recogidos automáticamente" },
        {
          type: "p",
          text: "En determinadas circunstancias podemos recoger datos de dispositivo, registro y uso de forma automática al usar los Servicios, conforme a la ley aplicable. Esto nos ayuda a mejorar la experiencia, dar soporte, mejorar el rendimiento, detectar abusos y proteger los Servicios.",
        },
        {
          type: "note",
          text: "Las direcciones IP pueden tratarse brevemente para enrutado de tráfico, localización por requisitos regulatorios y conexiones seguras con plataformas de terceros que elijas usar. No retenemos IPs para crear perfiles publicitarios.",
        },
        { type: "h3", text: "Datos agregados y anonimizados" },
        {
          type: "p",
          text: "Podemos usar datos agregados o anonimizados para mejorar los Servicios — por ejemplo analizando tendencias de uso sin identificar personas. Dichos datos pueden compartirse con proveedores o socios de confianza con fines de analítica, seguridad o desarrollo de negocio, sin revelar Datos Personales.",
        },
      ],
    },
    {
      id: "cookies",
      title: "3. Uso de cookies",
      blocks: [
        {
          type: "p",
          text: "Usamos cookies y tecnologías similares (incluido el almacenamiento local) para mejorar tu experiencia, prestar los Servicios, recordar preferencias y entender cómo se usan los Servicios. Según la ley aplicable, el banner de cookies te pedirá aceptar el almacenamiento esencial. Consulta nuestro Aviso de cookies para el detalle completo.",
        },
        {
          type: "link",
          href: "/cookies",
          label: "Aviso de cookies",
          prefix: "Ver también: ",
        },
      ],
    },
    {
      id: "sharing",
      title: "4. Cómo y por qué compartimos tus datos",
      blocks: [
        {
          type: "p",
          text: "La información de nuestros usuarios es importante para nuestro negocio y no vendemos Datos Personales. Podemos transferir Datos Personales a proveedores o terceros en relación con la operación de Trust Wallet Cloud, ya que ciertas funciones dependen de productos y servicios de terceros (conjuntamente “Servicios de Terceros”), como hosting, infraestructura cloud, proveedores RPC/red, datos de precios, analítica (si está habilitada) y mantenimiento.",
        },
        {
          type: "p",
          text: "Los proveedores terceros solo reciben los Datos Personales necesarios para sus funciones (por ejemplo direcciones públicas para consultas on-chain) y no pueden usarlos para otros fines. Deben tratarlos conforme a nuestros contratos y a la normativa de protección de datos aplicable.",
        },
        {
          type: "ul",
          items: [
            "Transferencias empresariales: si vendemos, compramos o reorganizamos negocios o activos, la información de usuarios puede formar parte de los activos transferidos, sujeta a las promesas del Aviso preexistente salvo que consientas otra cosa.",
            "Autoridades: podemos divulgar Datos Personales cuando lo exija la ley, un tribunal o una autoridad competente, o para hacer valer nuestros derechos y prevenir el fraude.",
            "Protección de nosotros y de terceros: podemos compartir información cuando creamos razonablemente que es necesario para cumplir la ley, cooperar con las fuerzas de seguridad, aplicar nuestros términos o proteger los derechos, la propiedad o la seguridad de Trust Wallet Cloud, nuestros usuarios u otros.",
          ],
        },
        {
          type: "p",
          text: "Nuestros Servicios pueden contener enlaces a sitios, dApps y plataformas de terceros. Esas plataformas actúan como responsables independientes; su tratamiento se rige por sus propias políticas de privacidad, no por este Aviso.",
        },
      ],
    },
    {
      id: "transfers",
      title: "5. Transferencias internacionales de Datos Personales",
      blocks: [
        {
          type: "p",
          text: "Podemos usar servidores alojados por proveedores de confianza, y tu información puede tratarse en servidores situados fuera de tu país de residencia. También podemos transferir Datos Personales a afiliados, socios y proveedores en otros países.",
        },
        {
          type: "p",
          text: "Cuando transferimos Datos Personales internacionalmente, aplicamos salvaguardas técnicas, organizativas y contractuales adecuadas — que pueden incluir Cláusulas Contractuales Tipo — para garantizar un nivel de protección adecuado conforme a la ley aplicable.",
        },
      ],
    },
    {
      id: "security",
      title: "6. Seguridad de los datos",
      blocks: [
        {
          type: "p",
          text: "La seguridad de la información es un componente clave de la privacidad. Aunque ninguna transmisión por Internet puede garantizarse como totalmente segura, empleamos medidas físicas, técnicas y organizativas comercialmente razonables para proteger los Datos Personales frente a accesos, usos, divulgaciones, alteraciones o destrucciones no autorizados.",
        },
        {
          type: "p",
          text: "Si eres usuario de la wallet de autocustodia, recuerda que tu frase semilla / claves privadas se almacenan en local en tu dispositivo bajo tu control. Activa códigos de acceso del dispositivo y de la wallet, y nunca compartas tu frase de recuperación con nadie — ni con quien diga representar a Trust Wallet Cloud.",
        },
        {
          type: "note",
          text: "Referenciamos prácticas de seguridad y gestión de privacidad alineadas con estándares como ISO/IEC 27001 e ISO/IEC 27701 cuando apliquen a nuestras operaciones y a las certificaciones mostradas en el sitio.",
        },
      ],
    },
    {
      id: "retention",
      title: "7. Conservación de datos",
      blocks: [
        {
          type: "p",
          text: "Conservamos los Datos Personales mientras sea necesario para prestar los Servicios, cumplir las finalidades de este Aviso, obligaciones legales, resolver disputas o según te comuniquemos.",
        },
        {
          type: "p",
          text: "Cuando ya no exista una necesidad legítima de negocio o legal, eliminamos o anonimizamos la información — o, si la eliminación no es inmediata (por ejemplo copias de seguridad), la aislamos de forma segura hasta poder borrarla.",
        },
        {
          type: "note",
          text: "Aunque borres los datos locales de la wallet, desinstales la PWA o solicites la eliminación, las redes blockchain son públicas y descentralizadas. Los registros on-chain generalmente no se pueden borrar, por lo que el derecho de supresión puede no aplicarse plenamente a esos datos.",
        },
      ],
    },
    {
      id: "rights",
      title: "8. ¿Qué derechos de privacidad tienes?",
      blocks: [
        {
          type: "p",
          text: "Según la ley aplicable, puedes tener derechos en relación con tus Datos Personales. Estos derechos pueden estar limitados en algunas situaciones — por ejemplo cuando tengamos una obligación legal de conservar datos.",
        },
        {
          type: "ol",
          items: [
            "Derecho de acceso: obtener una copia de los Datos Personales que tenemos sobre ti e información sobre su tratamiento.",
            "Derecho de rectificación: solicitar la corrección de Datos Personales inexactos o completar registros incompletos.",
            "Derecho de supresión: solicitar el borrado cuando los datos ya no sean necesarios para las finalidades recogidas (con excepciones legales).",
            "Derecho de oposición: oponerte al tratamiento basado en intereses legítimos o a fines de marketing directo.",
            "Derecho de limitación: solicitar la limitación temporal del tratamiento en determinados casos.",
            "Derecho a retirar el consentimiento: cuando el tratamiento se base en consentimiento, retirarlo en cualquier momento sin afectar al tratamiento previo lícito.",
            "Derecho de portabilidad: solicitar tus Datos Personales en un formato estructurado y de uso común cuando sea técnicamente posible.",
          ],
        },
        {
          type: "p",
          text: "Para ejercer tus derechos, contáctanos según la Sección 11. Responderemos lo antes posible y te explicaremos si no podemos atender una solicitud (salvo que la ley lo prohíba).",
        },
      ],
    },
    {
      id: "children",
      title: "9. Menores",
      blocks: [
        {
          type: "p",
          text: "Nuestros Servicios no están dirigidos a menores. Los usuarios deben tener al menos dieciocho (18) años. No solicitamos ni comercializamos conscientemente a menores de 18. Al usar los Servicios, declaras que tienes al menos 18 años. Si tenemos conocimiento de que hemos recogido Datos Personales de alguien menor de 18, tomaremos medidas razonables para eliminarlos salvo que la ley exija conservarlos.",
        },
      ],
    },
    {
      id: "revisions",
      title: "10. Condiciones de uso, avisos y revisiones",
      blocks: [
        {
          type: "p",
          text: "Si eliges usar nuestros Servicios, tu uso y cualquier disputa sobre privacidad queda sujeta a este Aviso y a los Términos de uso aplicables. También tienes derecho a contactar con tu Autoridad de Protección de Datos local.",
        },
        {
          type: "p",
          text: "Podemos actualizar este Aviso periódicamente. Cuando lo hagamos, revisaremos la fecha de “Última actualización” al inicio de esta página. Revísalo con regularidad. El uso continuado de los Servicios tras una actualización constituye la aceptación de los términos revisados, cuando la ley lo permita.",
        },
      ],
    },
    {
      id: "contact",
      title: "11. Contacto del equipo de privacidad",
      blocks: [
        {
          type: "p",
          text: "Para consultas de privacidad sobre Trust Wallet Cloud, contáctanos a través de los canales de soporte publicados en trustwalletcloud.com. Ten en cuenta que los canales de privacidad pueden no atender solicitudes generales de soporte de producto.",
        },
        {
          type: "p",
          text: "Gracias por leer nuestro Aviso de privacidad.",
        },
      ],
    },
  ],
};

const cookiesEn: LegalCopy = {
  title: "Trust Wallet Cloud Cookie Notice",
  updated: "Last Updated: July 18, 2026",
  back: "Back to home",
  tocTitle: "Contents",
  intro: [
    'This Cookie Notice describes how Trust Wallet Cloud (“Trust Wallet Cloud”, “we,” “our,” or “us”) uses “cookies” and other similar technologies, in connection with our websites (the “Site”) and applications or other services (collectively, together with the Website and the Apps, our “Service”).',
    "We use cookies and similar technologies (including local storage) to enhance your user experience, remember preferences and help keep the Service secure and reliable. When you visit the Site, you may be asked to accept essential storage, and you can also manage preferences through your browser settings.",
    "This Cookie Notice applies in addition to any other terms and policies published on the website, including the Privacy Notice and any Terms of Use.",
  ],
  sections: [
    {
      id: "what",
      title: "What are cookies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files placed on your device when you visit a website. They allow a site to recognise your device and store information about your visit, which may include content viewed, language preference, time and duration of each visit, and similar technical details.",
        },
        {
          type: "p",
          text: "Cookies managed by Trust Wallet Cloud are called “first-party cookies”, whereas cookies from third parties are called “third-party cookies”. We may also use similar technologies such as local storage, session storage and pixels where appropriate.",
        },
      ],
    },
    {
      id: "why",
      title: "Why do we use cookies and similar technologies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are a useful mechanism that perform different jobs, such as ensuring the website is secure and reliable, enhancing user experience and improving the website and services.",
        },
        {
          type: "p",
          text: "We may use cookies and similar technologies to:",
        },
        {
          type: "ul",
          items: [
            "ensure that our website and services function properly",
            "remember language and cookie-consent preferences",
            "detect and help prevent abuse or fraud",
            "understand how visitors use and engage with our websites and applications (in aggregated form where possible)",
            "analyse and improve our services",
          ],
        },
        {
          type: "p",
          text: "Some cookies, web beacons and other tracking or storage technologies may come from third-party companies (third-party cookies) to provide web analytics or measurement services, where enabled and permitted.",
        },
      ],
    },
    {
      id: "optout",
      title: "What if I don’t want cookies or similar tracking technologies?",
      blocks: [
        {
          type: "p",
          text: "You have the right to manage your preferences through your browser settings and, where available, through our cookie banner. To remove existing cookies or site storage from your device, use your browser’s options. If you wish to block future cookies, adjust your settings accordingly.",
        },
        {
          type: "note",
          text: "Please be aware that deleting or blocking cookies / local storage may affect your user experience. For example, you may need to re-select your language, re-accept essential storage, or re-import a wallet if you clear encrypted vault data stored locally.",
        },
        {
          type: "link",
          href: "/privacy",
          label: "Privacy Notice",
          prefix: "For more on how we process Personal Data, see our ",
        },
      ],
    },
    {
      id: "types",
      title: "What types of cookies does Trust Wallet Cloud use?",
      blocks: [
        {
          type: "p",
          text: "The cookies and similar technologies used on Trust Wallet Cloud sites have been categorised as in the table below. Not all categories may be used in all jurisdictions or on every page.",
        },
        {
          type: "table",
          headers: ["Category", "Description"],
          rows: [
            [
              "Strictly Necessary cookies / storage",
              "Necessary for the website and wallet to function and cannot be switched off in our systems. They are usually set in response to actions that amount to a request for services, such as setting privacy preferences, remembering language, or storing encrypted wallet vault data locally. You can set your browser to block or alert you about these, but some parts of the site or wallet will not work. These do not store advertising profiles.",
            ],
            [
              "Performance cookies",
              "Allow us to count visits and traffic sources so we can measure and improve site performance. They help us know which pages are most and least popular and how visitors move around the site. Information collected is typically aggregated. If you do not allow these cookies we may not know when you have visited our site or be able to monitor its performance.",
            ],
            [
              "Functionality cookies",
              "Enable enhanced functionality and personalisation (for example remembering UI preferences). They may be set by us or by a third-party provider whose services we have added. If you don’t allow these cookies some services may not function properly.",
            ],
            [
              "Targeting cookies",
              "May be set through our site by advertising partners (if used). They can be used by third parties to build a profile of interests based on browsing information. Trust Wallet Cloud does not rely on advertising cookies for the core self-custody wallet experience. If you do not allow these cookies you may still see generic advertising elsewhere on the web.",
            ],
          ],
        },
        { type: "h3", text: "Examples of storage we use" },
        {
          type: "ul",
          items: [
            "Cookie consent choice (local storage) — remembers whether you accepted the banner.",
            "Landing language preference (local storage) — remembers the language you selected.",
            "Wallet vault & settings (local storage / device storage) — encrypted wallet material and app settings when you use /wallet. This is essential for self-custody and remains on your device.",
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to our Cookie Notice",
      blocks: [
        {
          type: "p",
          text: "We may update this Cookie Notice from time to time. Please refer to the “Last Updated” date at the top of this page to see when it was last revised. Review this Notice regularly to stay aware of its terms. Your continued use of our Services after an amendment constitutes your acceptance of the revised terms, where permitted by law.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact Information — Privacy Team",
      blocks: [
        {
          type: "p",
          text: "For privacy-related inquiries about cookies or this Notice, please reach out through the support channels published on trustwalletcloud.com.",
        },
        {
          type: "p",
          text: "For general wallet product support, use the product support channels. We may not be able to respond to non-privacy requests submitted via privacy channels.",
        },
      ],
    },
    {
      id: "resources",
      title: "Additional Resources",
      blocks: [
        {
          type: "p",
          text: "The following links explain how to access cookie settings in various browsers:",
        },
        {
          type: "ul",
          items: [
            "Cookie settings in Google Chrome — chrome://settings/cookies",
            "Cookie settings in Microsoft Edge — edge://settings/content/cookies",
            "Cookie settings in Firefox — about:preferences#privacy",
            "Cookie settings in Safari (macOS / iOS) — Preferences / Settings → Privacy",
            "Cookie settings in Android — Chrome or browser settings → Site settings → Cookies",
          ],
        },
        {
          type: "link",
          href: "/privacy",
          label: "Privacy Notice",
          prefix: "Related: ",
        },
      ],
    },
  ],
};

const cookiesEs: LegalCopy = {
  title: "Aviso de cookies de Trust Wallet Cloud",
  updated: "Última actualización: 18 de julio de 2026",
  back: "Volver al inicio",
  tocTitle: "Contenido",
  intro: [
    "Este Aviso de cookies describe cómo Trust Wallet Cloud (“Trust Wallet Cloud”, “nosotros”, “nuestro”) utiliza “cookies” y otras tecnologías similares en relación con nuestros sitios web (el “Sitio”) y aplicaciones u otros servicios (conjuntamente, nuestro “Servicio”).",
    "Usamos cookies y tecnologías similares (incluido el almacenamiento local) para mejorar tu experiencia, recordar preferencias y ayudar a que el Servicio sea seguro y fiable. Cuando visitas el Sitio, puedes aceptar el almacenamiento esencial y también gestionar preferencias desde la configuración de tu navegador.",
    "Este Aviso se aplica además de cualquier otro término y política publicados en el sitio, incluido el Aviso de privacidad y los Términos de uso.",
  ],
  sections: [
    {
      id: "what",
      title: "¿Qué son las cookies?",
      blocks: [
        {
          type: "p",
          text: "Las cookies son pequeños archivos de texto que se colocan en tu dispositivo cuando visitas un sitio web. Permiten que un sitio reconozca tu dispositivo y almacene información sobre tu visita, que puede incluir contenido visto, preferencia de idioma, hora y duración de cada visita, y detalles técnicos similares.",
        },
        {
          type: "p",
          text: "Las cookies gestionadas por Trust Wallet Cloud se denominan “cookies propias”, mientras que las de terceros se denominan “cookies de terceros”. También podemos usar tecnologías similares como local storage, session storage y píxeles cuando corresponda.",
        },
      ],
    },
    {
      id: "why",
      title: "¿Por qué usamos cookies y tecnologías similares?",
      blocks: [
        {
          type: "p",
          text: "Las cookies son un mecanismo útil que realiza distintas tareas, como garantizar que el sitio sea seguro y fiable, mejorar la experiencia de usuario y mejorar el sitio y los servicios.",
        },
        {
          type: "p",
          text: "Podemos usar cookies y tecnologías similares para:",
        },
        {
          type: "ul",
          items: [
            "garantizar que el sitio web y los servicios funcionen correctamente",
            "recordar el idioma y la elección de consentimiento de cookies",
            "detectar y ayudar a prevenir abusos o fraude",
            "entender cómo los visitantes usan e interactúan con nuestros sitios y aplicaciones (de forma agregada cuando sea posible)",
            "analizar y mejorar nuestros servicios",
          ],
        },
        {
          type: "p",
          text: "Algunas cookies, balizas web y otras tecnologías de seguimiento o almacenamiento pueden proceder de terceros (cookies de terceros) para ofrecer analítica web o servicios de medición, cuando estén habilitados y permitidos.",
        },
      ],
    },
    {
      id: "optout",
      title: "¿Qué ocurre si no quiero cookies ni tecnologías similares?",
      blocks: [
        {
          type: "p",
          text: "Tienes derecho a gestionar tus preferencias desde la configuración del navegador y, cuando esté disponible, desde nuestro banner de cookies. Para eliminar cookies o almacenamiento del sitio existentes, usa las opciones del navegador. Si deseas bloquear cookies futuras, ajusta tus ajustes en consecuencia.",
        },
        {
          type: "note",
          text: "Ten en cuenta que borrar o bloquear cookies / almacenamiento local puede afectar a tu experiencia. Por ejemplo, puede que tengas que volver a elegir el idioma, aceptar de nuevo el almacenamiento esencial o reimportar una wallet si borras el vault cifrado guardado en local.",
        },
        {
          type: "link",
          href: "/privacy",
          label: "Aviso de privacidad",
          prefix: "Para más información sobre el tratamiento de Datos Personales, consulta nuestro ",
        },
      ],
    },
    {
      id: "types",
      title: "¿Qué tipos de cookies usa Trust Wallet Cloud?",
      blocks: [
        {
          type: "p",
          text: "Las cookies y tecnologías similares usadas en los sitios de Trust Wallet Cloud se han categorizado según la tabla siguiente. No todas las categorías se usan en todas las jurisdicciones ni en todas las páginas.",
        },
        {
          type: "table",
          headers: ["Categoría", "Descripción"],
          rows: [
            [
              "Cookies / almacenamiento estrictamente necesarios",
              "Necesarios para que el sitio y la wallet funcionen y no se pueden desactivar en nuestros sistemas. Suelen establecerse en respuesta a acciones que equivalen a una solicitud de servicios, como fijar preferencias de privacidad, recordar el idioma o guardar en local el vault cifrado de la wallet. Puedes configurar el navegador para bloquearlos o avisarte, pero algunas partes del sitio o de la wallet no funcionarán. No almacenan perfiles publicitarios.",
            ],
            [
              "Cookies de rendimiento",
              "Permiten contar visitas y fuentes de tráfico para medir y mejorar el rendimiento del sitio. Ayudan a saber qué páginas son más y menos populares y cómo se mueven los visitantes. La información suele ser agregada. Si no las permites, puede que no sepamos cuándo has visitado el sitio ni podamos monitorizar su rendimiento.",
            ],
            [
              "Cookies de funcionalidad",
              "Permiten funcionalidad mejorada y personalización (por ejemplo recordar preferencias de interfaz). Pueden establecerlas nosotros o un proveedor tercero cuyos servicios hayamos añadido. Si no las permites, algunos servicios pueden no funcionar correctamente.",
            ],
            [
              "Cookies de segmentación",
              "Pueden establecerse a través de nuestro sitio por socios publicitarios (si se usan). Los terceros pueden usarlas para crear un perfil de intereses a partir de la navegación. Trust Wallet Cloud no depende de cookies publicitarias para la experiencia principal de autocustodia. Si no las permites, puedes seguir viendo publicidad genérica en otros lugares de la web.",
            ],
          ],
        },
        { type: "h3", text: "Ejemplos de almacenamiento que usamos" },
        {
          type: "ul",
          items: [
            "Elección de consentimiento de cookies (local storage) — recuerda si aceptaste el banner.",
            "Preferencia de idioma de la landing (local storage) — recuerda el idioma seleccionado.",
            "Vault y ajustes de la wallet (local storage / almacenamiento del dispositivo) — material cifrado de la wallet y ajustes de la app al usar /wallet. Es esencial para la autocustodia y permanece en tu dispositivo.",
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "Cambios en nuestro Aviso de cookies",
      blocks: [
        {
          type: "p",
          text: "Podemos actualizar este Aviso de cookies periódicamente. Consulta la fecha de “Última actualización” al inicio de esta página para ver cuándo se revisó por última vez. Revísalo con regularidad. El uso continuado de nuestros Servicios tras una modificación constituye la aceptación de los términos revisados, cuando la ley lo permita.",
        },
      ],
    },
    {
      id: "contact",
      title: "Información de contacto — Equipo de privacidad",
      blocks: [
        {
          type: "p",
          text: "Para consultas de privacidad sobre cookies o este Aviso, contáctanos a través de los canales de soporte publicados en trustwalletcloud.com.",
        },
        {
          type: "p",
          text: "Para soporte general de la wallet, usa los canales de producto. Puede que no podamos responder a solicitudes que no sean de privacidad enviadas por canales de privacidad.",
        },
      ],
    },
    {
      id: "resources",
      title: "Recursos adicionales",
      blocks: [
        {
          type: "p",
          text: "Los siguientes enlaces explican cómo acceder a la configuración de cookies en distintos navegadores:",
        },
        {
          type: "ul",
          items: [
            "Configuración de cookies en Google Chrome — chrome://settings/cookies",
            "Configuración de cookies en Microsoft Edge — edge://settings/content/cookies",
            "Configuración de cookies en Firefox — about:preferences#privacy",
            "Configuración de cookies en Safari (macOS / iOS) — Preferencias / Ajustes → Privacidad",
            "Configuración de cookies en Android — Chrome o ajustes del navegador → Ajustes del sitio → Cookies",
          ],
        },
        {
          type: "link",
          href: "/privacy",
          label: "Aviso de privacidad",
          prefix: "Relacionado: ",
        },
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
