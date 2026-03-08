import type { HttpClient } from './http.js';
import type { ApiResponse, SubmitResult } from '../types/index.js';

export interface WasmProxyTransactionParams {
  callerPublicKey: string;
  contractPackageHash: string;
  entryPoint: string;
  /** Hex-encoded serialized inner args bytes (from Args.toBytes()) */
  args: string;
  attachedAmount: number;
  paymentAmount: number;
}

export class SubmissionApi {
  constructor(private readonly http: HttpClient) {}

  /** Ask the API to build an unsigned TransactionV1 with the proxy WASM. */
  async createWasmProxyTransaction(params: WasmProxyTransactionParams): Promise<unknown> {
    const response = await this.http.post<ApiResponse<unknown>>(
      '/wasm-proxy-transaction',
      {
        caller_public_key: params.callerPublicKey,
        contract_package_hash: params.contractPackageHash,
        entry_point: params.entryPoint,
        args: params.args,
        attached_amount: params.attachedAmount,
        payment_amount: params.paymentAmount,
      },
    );
    return response.data;
  }

  async submitTransaction(signedTransactionJson: unknown): Promise<SubmitResult> {
    const response = await this.http.post<ApiResponse<{ api_version: string; transaction_hash: { Version1: string } }>>(
      '/wasm-proxy-transaction-submission',
      signedTransactionJson
    );
    return {
      transactionHash: response.data.transaction_hash?.Version1 ?? '',
    };
  }
}
