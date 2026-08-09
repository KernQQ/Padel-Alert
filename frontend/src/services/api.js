const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : `http://${window.location.hostname}:3000`);

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal
    });

    return response;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Serwer odpowiada zbyt długo. Spróbuj ponownie za chwilę."
      );
    }

    throw new Error(
      "Brak połączenia z PadelAlert. Sprawdź backend i połączenie sieciowe."
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export { API_URL };
