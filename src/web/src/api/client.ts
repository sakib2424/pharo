export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError('Unable to reach the price service. Please try again.');
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 404
        ? 'This instrument is not available in the dataset.'
        : 'The price service could not complete this request. Please try again.',
      response.status,
    );
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError('The price service returned an unreadable response. Please try again.');
  }
}
