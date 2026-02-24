export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Record<string, string> = {},
  ) {}

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.headers },
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const body = await response.json();
    if (!response.ok) {
      const message = body?.error?.message ?? body?.message ?? `HTTP ${response.status}`;
      throw new HttpClientError(message, response.status, body);
    }
    return body as T;
  }
}
