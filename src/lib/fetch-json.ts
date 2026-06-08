/** Parsea respuesta fetch como JSON; mensaje claro si Vercel devuelve HTML (timeout/504). */
export async function fetchJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit
): Promise<{ res: Response; json: T }> {
  const res = await fetch(url, init);
  const text = await res.text();

  if (!text.trim()) {
    throw new Error(`Respuesta vacía del servidor (${res.status}). ¿Timeout de Vercel?`);
  }

  try {
    return { res, json: JSON.parse(text) as T };
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 100);
    throw new Error(
      `Error ${res.status} — el servidor no devolvió JSON (${snippet}…). ` +
        "Suele ser timeout de Vercel; espera unos segundos e intenta de nuevo."
    );
  }
}
