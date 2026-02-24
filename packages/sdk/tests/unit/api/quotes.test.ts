import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotesApi } from '../../../src/api/quotes.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('QuotesApi', () => {
  let api: QuotesApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new QuotesApi(mockHttp);
  });

  it('should fetch exact-in quote', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: {
        amount_in: '100000000000',
        amount_out: '50000000',
        execution_price: '50000000',
        mid_price: '50100000',
        path: ['hash-wcspr', 'hash-usdt'],
        price_impact: '0.20',
        recommended_slippage_bps: '20',
        type_id: 1,
      },
    });

    const quote = await api.getQuote({
      tokenIn: 'hash-0000',
      tokenOut: 'hash-usdt',
      amount: '100000000000',
      typeId: 1,
    });

    expect(quote.amount_in).toBe('100000000000');
    expect(quote.amount_out).toBe('50000000');
    expect(quote.price_impact).toBe('0.20');
  });

  it('should pass correct query params', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: {} });

    await api.getQuote({
      tokenIn: 'hash-aaa',
      tokenOut: 'hash-bbb',
      amount: '1000',
      typeId: 2,
    });

    expect(mockHttp.get).toHaveBeenCalledWith('/quote', {
      token_in: 'hash-aaa',
      token_out: 'hash-bbb',
      amount: '1000',
      type_id: '2',
    });
  });
});
