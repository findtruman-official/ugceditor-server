import { Injectable, Logger } from '@nestjs/common';
import { SolanaDevnetService } from './solana/solana-devnet.service';
import { TezosGhostTestnetService } from './tezos/tezos-ghost-testnet/tezos-ghost-testnet.service';

type ChainInfo = {
  name: string;
  type: string;
  factoryAddress: string;
  findsAddress: string;
};

@Injectable()
export class ChainService {
  private _logger = new Logger(ChainService.name);

  private _chains: Record<ChainIntegration['chain'], ChainIntegration> = {};

  constructor(
    solDevChain: SolanaDevnetService,
    tezGhostTest: TezosGhostTestnetService,
  ) {
    const chainIntegrs = [solDevChain, tezGhostTest];
    for (const integr of chainIntegrs) {
      this._chains[integr.chain] = integr;
    }
  }

  async listChains(): Promise<ChainInfo[]> {
    return Object.values(this._chains).map((chain) => ({
      name: chain.name,
      type: chain.chain,
      factoryAddress: chain.factoryAddress,
      findsAddress: chain.findsAddress,
    }));
  }

  async getChainInfo(chain: string): Promise<ChainInfo> {
    const chainIntegr = this._getChainIntegr(chain);
    if (!chainIntegr) {
      throw new Error('can not get chain info');
    }
    return {
      name: chainIntegr.name,
      type: chainIntegr.chain,
      factoryAddress: chainIntegr.factoryAddress,
      findsAddress: chainIntegr.findsAddress,
    };
  }

  async isValidSignature(
    chain: string,
    signature: string,
    account: string,
    message: string,
  ): Promise<boolean> {
    const chainIntegr = this._getChainIntegr(chain);
    if (!chainIntegr) {
      return false;
    }

    return await chainIntegr.isValidSignature({
      signature,
      account,
      message,
    });
  }

  async formatGeneralMetadatas(
    chain: string,
    items: Parameters<ChainIntegration['formatGeneralMetadatas']>[0],
  ): Promise<ReturnType<ChainIntegration['formatGeneralMetadatas']>> {
    const integr = this._getChainIntegr(chain);
    if (!integr) {
      return [];
    }
    return integr.formatGeneralMetadatas(items);
  }

  private _getChainIntegr(chain: string): ChainIntegration | undefined {
    const chainIntegr = this._chains[chain];
    if (!chainIntegr) {
      this._logger.warn(`invalid chain: ${chain}`);
    }
    return chainIntegr;
  }
}
