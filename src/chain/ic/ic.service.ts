import fetch from 'isomorphic-fetch';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoryChainTaskService } from 'src/story-chain-task/story-chain-task.service';
import { StoryService } from 'src/story/story.service';
import { Actor, ActorSubclass, HttpAgent } from '@dfinity/agent';
import {
  Def_SERVICE,
  idlFactory,
} from './declarations/story-factory/backend.did';
import {
  idlFactory as StoryNftIDL,
  StoryNftService,
} from './declarations/story-nft';
import { NftType } from 'src/story/entities/nft-sale.entity';

@Injectable()
export class IcService implements Chain.ChainIntegration {
  /**
   * chain identifier. eg. 'solana-devnet'
   */
  chain = 'ic';

  /**
   * chain readable name. eg. 'Solana(Devnet)'
   */
  name = 'Dfinity';

  /**
   * Story Factory address on chain
   */
  factoryAddress: string;

  /**
   * $Finds Token address
   */
  findsAddress: string;

  /**
   * Whether chain integration is enabled;
   */
  enabled: boolean;

  /**
   * Task Module Type
   * basic: use centralized task system
   * chain: use on-chain task system (ChainIntegration)
   */
  taskModule: Chain.TaskModuleType = 'basic';

  private _agent: HttpAgent;
  private _storyFactory: Def_SERVICE;
  private _logger = new Logger(IcService.name);

  constructor(
    private readonly _configSvc: ConfigService,
    private readonly _storySvc: StoryService,
    private readonly _chainTaskSvc: StoryChainTaskService,
  ) {}

  async onModuleInit() {
    this.enabled = this._configSvc.get('IC_ENABLE') === 'true';
    if (!this.enabled) return;

    this.factoryAddress = this._configSvc.get('IC_FACTORY_ADDRESS');
    this.findsAddress = this._configSvc.get('IC_FINDS');
    const enableSync = this._configSvc.get('IC_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('IC_ENDPOINT');

    this._agent = new HttpAgent({
      // identity: await identity,
      host: endpoint,
      fetch,
    });

    this._storyFactory = Actor.createActor(idlFactory as any, {
      agent: this._agent,
      canisterId: this.factoryAddress,
    });

    if (enableSync) {
      this.startSyncLoop().catch((err) => {
        this._logger.error(err);
      });
    }
  }
  /**
   * verify the signature is account signed
   */
  async isValidSignature(
    params: Chain.IsValidSignatureParams,
  ): Promise<boolean> {
    return true;
  }

  /**
   * Convert NFT metadata into an on-chain specific format
   * (which will be finally stored it on the IPFS network)
   */
  async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    // TODO
    return metadatas.map((m) => ({
      item: m,
      json: m,
    }));
  }

  /**
   * Returns null if the story does not exist
   */
  async getStory(chainStoryId: string): Promise<Chain.Story> {
    const result = await this._storyFactory.getStory(BigInt(chainStoryId));
    if (result.length == 0) {
      return null;
    }

    const [dat] = result;
    return {
      id: chainStoryId,
      author: dat.author.toString(),
      cid: dat.cid,
      addr: this.factoryAddress,
    };
  }

  /**
   * Returns null if the story does not exist
   */
  async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const result = await this._storyFactory.getSale(BigInt(chainStoryId));
    if (result.length == 0) {
      return null;
    }

    const [sale] = result;
    const bn2n = (n: bigint) => +n.toString();

    const nft: ActorSubclass<StoryNftService> = Actor.createActor(StoryNftIDL, {
      agent: this._agent,
      canisterId: sale.nft,
    });

    return {
      authorClaimed: bn2n(sale.authorClaimed),
      authorReserved: bn2n(sale.authorReserved),
      total: bn2n(sale.total),
      sold: bn2n(sale.sold),
      saleAddr: this.factoryAddress, // no meanings, just use factory
      name: await nft.nameDip721(),
      uriPrefix: sale.uriPrefix,
      type: '721',
      price: sale.price.toString(),
    };
  }

  async getTask(
    chainStoryId: string,
    chainTaskId: string,
  ): Promise<Chain.Task> {
    return null;
  }

  async getSubmit(
    chainStoryId: string,
    chainTaskId: string,
    chainSubmitId: string,
  ): Promise<Chain.Submit> {
    return null;
  }

  private async startSyncLoop() {
    const syncInterval =
      parseInt(this._configSvc.get('IC_SYNC_INTERVAL')) * 1000;
    while (true) {
      try {
        await this.syncChainData();
      } catch (err) {
        this._logger.error(err);
      }
      this._logger.debug(`next sync after ${syncInterval / 1000} seconds`);
      await new Promise((res) => setTimeout(res, syncInterval));
    }
  }

  private async syncChainData() {
    /**
     * sync all data on chain every 10 minutes
     */

    this._logger.debug(`[sync] start`);
    const storiesInDb = await this._storySvc.listStories({
      chain: [this.chain],
    });
    const salesInDb = await this._storySvc.listNftSales({
      chain: [this.chain],
    });
    this._logger.debug(
      `[sync] ${storiesInDb.length} stories & ${salesInDb.length} sales in db`,
    );
    const nextStoryId = await this.getNextStoryId();
    this._logger.debug(`[sync] there is ${nextStoryId - 1} stories on chain`);

    const toCreateStories: Parameters<StoryService['createStories']>[0] = [];
    const toUpdateStories: Parameters<
      StoryService['updateStoriesContentHash']
    >[0] = [];
    const toCreateSales: Parameters<StoryService['createNftSales']>[0] = [];
    const toUpdateSales: Parameters<StoryService['updateNftSales']>[0] = [];
    for (let storyId = 1; storyId < nextStoryId; storyId++) {
      const existedStoryInDb = storiesInDb.find(
        (story) => story.chainStoryId === storyId.toString(),
      );
      // sync story
      const storyInfo = await this.getStory(storyId.toString());

      if (!existedStoryInDb) {
        // not existed in db, will create story
        toCreateStories.push({
          chain: this.chain,
          chainStoryId: storyInfo.id,
          onChainAddr: storyInfo.addr,
          author: storyInfo.author,
          contentHash: storyInfo.cid,
        });
      } else {
        // existed in db, check whether to update
        if (existedStoryInDb.contentHash !== storyInfo.cid) {
          // story cid updated, shoule update in db
          toUpdateStories.push({
            chain: this.chain,
            chainStoryId: storyInfo.id,
            contentHash: storyInfo.cid,
          });
        }
      }

      // sync sales
      const sale = await this.getStoryNftSale(storyId.toString());
      if (sale) {
        const existedSaleInDb = salesInDb.find(
          (sale) => sale.chainStoryId === storyId.toString(),
        );
        if (!existedSaleInDb) {
          // not existed in db, will create sale
          toCreateSales.push({
            chain: this.chain,
            chainStoryId: storyId.toString(),
            nftSaleAddr: this.factoryAddress,
            name: sale.name,
            uriPrefix: sale.uriPrefix,
            type: NftType.NON_FUNGIBLE_TOKEN,
            price: sale.price,
            total: sale.total,
            sold: sale.sold,
            authorClaimed: sale.authorClaimed,
            authorReserved: sale.authorReserved,
          });
        } else {
          if (
            existedSaleInDb.sold !== sale.sold ||
            existedSaleInDb.authorClaimed !== sale.authorClaimed
          ) {
            // state changed , will update sale
            toUpdateSales.push({
              ...existedSaleInDb,
              sold: sale.sold,
              authorClaimed: sale.authorClaimed,
            });
          }
        }
      }
    }

    this._logger.debug(
      `[sync] stories : ${toCreateStories.length} created ${toUpdateStories.length} updated`,
    );
    this._logger.debug(
      `[sync] sales : ${toCreateSales.length} created ${toUpdateSales.length} updated`,
    );

    await this._storySvc.createStories(toCreateStories);
    await this._storySvc.updateStoriesContentHash(toUpdateStories);
    await this._storySvc.createNftSales(toCreateSales);
    await this._storySvc.updateNftSales(toUpdateSales);

    this._logger.debug(`[sync] done`);
  }

  private async getNextStoryId(): Promise<number> {
    return +(await this._storyFactory.countStories()).toString() + 1;
  }
}
