import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../src/api/http.js';

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient('https://api.example.com');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET requests with correct URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' })));

    await client.get('/tokens');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/tokens',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should append query parameters', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' })));

    await client.get('/tokens', { includes: 'csprtrade_data(1)' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/tokens?includes=csprtrade_data%281%29',
      expect.anything()
    );
  });

  it('should parse JSON responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 1 }] }))
    );

    const result = await client.get<{ data: { id: number }[] }>('/tokens');
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should throw on HTTP errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
    );

    await expect(client.get('/missing')).rejects.toThrow();
  });

  it('should make POST requests with body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'ok' })));

    await client.post('/submit', { key: 'value' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/submit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      })
    );
  });
});
