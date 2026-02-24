import type { HttpClient } from './http.js';
import type { ApiResponse, SubmitResult } from '../types/index.js';

export class SubmissionApi {
  constructor(private readonly http: HttpClient) {}

  async submitTransaction(signedDeployJson: unknown): Promise<SubmitResult> {
    const response = await this.http.post<ApiResponse<{ api_version: string; transaction_hash: { Version1: string } }>>(
      '/wasm-proxy-transaction-submission',
      signedDeployJson
    );
    return {
      transactionHash: response.data.transaction_hash?.Version1 ?? '',
    };
  }
}
