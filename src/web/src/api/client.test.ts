import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, getJson } from './client';

afterEach(() => vi.unstubAllGlobals());

it('preserves a 404 as a distinct non-retriable error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
  await expect(getJson('/api/prices/MISSING', new AbortController().signal)).rejects.toMatchObject({
    status: 404,
  });
});
it('turns network and invalid JSON failures into readable errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(getJson('/api/instruments', new AbortController().signal)).rejects.toThrow(
    'Unable to reach',
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')));
  await expect(getJson('/api/instruments', new AbortController().signal)).rejects.toBeInstanceOf(
    ApiError,
  );
});
it('preserves cancellation so query disposal is not reported as a service failure', async () => {
  const controller = new AbortController();
  controller.abort();
  const error = new DOMException('Aborted', 'AbortError');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(getJson('/api/instruments', controller.signal)).rejects.toBe(error);
});
