import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { Transaction, PrivateKey, KeyAlgorithm } from 'casper-js-sdk';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatDeployArtifact, getDeployInputDescription, readDeployJson } from './deploy-file.js';

export function registerSignerTools(server: McpServer) {
  server.tool(
    'sign_deploy',
    'Sign an unsigned Casper deploy locally. Private key never leaves this machine. Supports PEM key files and BIP-39 mnemonic phrases.',
    {
      deploy_json: z.string().describe(getDeployInputDescription('unsigned')),
      key_source: z.enum(['pem_file', 'pem_env', 'mnemonic']).describe(
        '"pem_file" = read PEM from CSPR_TRADE_KEY_PATH env var, ' +
        '"pem_env" = read PEM content from CSPR_TRADE_KEY_PEM env var, ' +
        '"mnemonic" = derive from CSPR_TRADE_MNEMONIC env var'
      ),
      algorithm: z.enum(['ed25519', 'secp256k1']).optional().describe('Key algorithm (default "ed25519")'),
      mnemonic_index: z.number().optional().describe('HD wallet derivation index (default 0, only used with mnemonic)'),
    },
    async (args) => {
      const algo = args.algorithm === 'secp256k1' ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;

      // Load private key based on source
      let privateKey;
      switch (args.key_source) {
        case 'pem_file': {
          const keyPath = process.env.CSPR_TRADE_KEY_PATH;
          if (!keyPath) {
            return { content: [{ type: 'text' as const, text: 'Error: CSPR_TRADE_KEY_PATH environment variable is not set.' }] };
          }
          const pem = await readFile(keyPath, 'utf8');
          privateKey = PrivateKey.fromPem(pem, algo);
          break;
        }
        case 'pem_env': {
          const pem = process.env.CSPR_TRADE_KEY_PEM;
          if (!pem) {
            return { content: [{ type: 'text' as const, text: 'Error: CSPR_TRADE_KEY_PEM environment variable is not set.' }] };
          }
          privateKey = PrivateKey.fromPem(pem, algo);
          break;
        }
        case 'mnemonic': {
          const mnemonic = process.env.CSPR_TRADE_MNEMONIC;
          if (!mnemonic) {
            return { content: [{ type: 'text' as const, text: 'Error: CSPR_TRADE_MNEMONIC environment variable is not set.' }] };
          }

          if (!bip39.validateMnemonic(mnemonic, wordlist)) {
            return { content: [{ type: 'text' as const, text: 'Error: Invalid mnemonic phrase.' }] };
          }

          const seed = bip39.mnemonicToSeedSync(mnemonic);
          const hdkey = HDKey.fromMasterSeed(seed);
          const index = args.mnemonic_index ?? 0;
          // Casper BIP-44 coin type is 506
          const child = hdkey.derive(`m/44'/506'/0'/0/${index}`);
          if (!child.privateKey) {
            return { content: [{ type: 'text' as const, text: 'Error: Failed to derive key from mnemonic.' }] };
          }
          privateKey = PrivateKey.fromHex(
            Buffer.from(child.privateKey).toString('hex'),
            algo,
          );
          break;
        }
      }

      // Parse and sign the deploy (inline JSON by default; local temp-file mode can opt in)
      const deployJsonStr = await readDeployJson(args.deploy_json);
      const transaction = Transaction.fromJSON(JSON.parse(deployJsonStr));
      transaction.sign(privateKey);
      const signedJson = JSON.stringify(transaction.toJSON());

      const signerPubKey = privateKey.publicKey.toHex();
      return {
        content: [{
          type: 'text' as const,
          text: `Transaction signed successfully.\nSigner: ${signerPubKey}\nTransaction hash: ${transaction.hash.toHex()}\n${await formatDeployArtifact('Signed transaction', signedJson)}`,
        }],
      };
    },
  );
}
