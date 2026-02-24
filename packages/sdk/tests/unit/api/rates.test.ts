import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatesApi } from '../../../src/api/rates.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('RatesApi', () => {
  let api: RatesApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new RatesApi(mockHttp);
  });

  it('should fetch CSPR fiat rate', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: { rate: 0.025 } });
    const rate = await api.getCsprRate(1);
    expect(mockHttp.get).toHaveBeenCalledWith('/rates/1/latest');
  });

  it('should fetch token fiat rate', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: { amount: '1.00' } });
    const rate = await api.getTokenRate('hash-abc', 1);
    expect(mockHttp.get).toHaveBeenCalledWith('/ft/hash-abc/rates/latest', { currency_id: '1' });
  });
});
