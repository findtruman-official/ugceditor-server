import { Injectable, Logger } from '@nestjs/common';
import { KlaytnBaobabService } from './klaytn/klaytn-baobab/klaytn-baobab.service';
import { SolanaDevnetService } from './solana/solana-devnet/solana-devnet.service';
import { TezosGhostTestnetService } from './tezos/tezos-ghost-testnet/tezos-ghost-testnet.service';

type ChainInfo = {
  name: string;
  type: string;
  factoryAddress: string;
  findsAddress: string;
  taskModule: Chain.TaskModuleType;
};

@Injectable()
export class ChainService {
  private _logger = new Logger(ChainService.name);

  private _chains: Record<
    Chain.ChainIntegration['chain'],
    Chain.ChainIntegration
  > = {};

  private _impls: Chain.ChainIntegration[] = [];

  constructor(
    solDevChain: SolanaDevnetService,
    tezGhostTest: TezosGhostTestnetService,
    klaytnBaobab: KlaytnBaobabService,
  ) {
    this._impls = [solDevChain, tezGhostTest, klaytnBaobab];
  }

  async onModuleInit() {
    for (const integr of this._impls) {
      if (integr.enabled) {
        this._chains[integr.chain] = integr;
      }
    }
  }

  async listChains(): Promise<ChainInfo[]> {
    return await Promise.all(
      Object.keys(this._chains).map((c) => this.getChainInfo(c)),
    );
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
      taskModule: chainIntegr.taskModule,
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
    items: Parameters<Chain.ChainIntegration['formatGeneralMetadatas']>[0],
  ): Promise<ReturnType<Chain.ChainIntegration['formatGeneralMetadatas']>> {
    const integr = this._getChainIntegr(chain);
    if (!integr) {
      return [];
    }
    return integr.formatGeneralMetadatas(items);
  }

  async getStory(chain: string, chainStoryId: string): Promise<Chain.Story> {
    const integr = this._getChainIntegr(chain);
    if (!integr) return null;
    return await integr.getStory(chainStoryId);
  }

  async getStoryNftSale(
    chain: string,
    chainStoryId: string,
  ): Promise<Chain.NftSale> {
    const integr = this._getChainIntegr(chain);
    if (!integr) return null;
    return await integr.getStoryNftSale(chainStoryId);
  }

  private _getChainIntegr(chain: string): Chain.ChainIntegration | undefined {
    const chainIntegr = this._chains[chain];
    if (!chainIntegr) {
      this._logger.warn(`invalid chain: ${chain}`);
    }
    return chainIntegr;
  }
}
