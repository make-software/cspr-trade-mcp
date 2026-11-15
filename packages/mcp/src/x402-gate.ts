import type { Express, NextFunction, Request, Response } from 'express';

/** MCP endpoints whose premium tool calls are paid. */
export const X402_PAID_PATHS: readonly string[] = ['/mcp'];

type Middleware = (req: Request, res: Response, next: NextFunction) => unknown;

/**
 * Runs the x402 payment middleware for premium MCP calls only.
 *
 * Mounted at the app root on purpose: under `app.use('/mcp', ...)` Express
 * strips the mount path, so the x402 middleware sees `req.path === '/'`,
 * matches no route and lets every premium call through unpaid.
 */
export function installX402Gate(
  app: Express,
  x402Middleware: Middleware,
  isPremiumCall: (body: unknown) => boolean,
  paidPaths: readonly string[] = X402_PAID_PATHS,
): void {
  app.use((req: Request & { body?: unknown }, res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !paidPaths.includes(req.path) || !isPremiumCall(req.body)) {
      next();
      return;
    }
    void x402Middleware(req, res, next);
  });
}
