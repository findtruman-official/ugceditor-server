import { Injectable, Logger } from '@nestjs/common';
import { StoryService } from '../../../story/story.service';
import { ConfigService } from '@nestjs/config';
import * as nearAPI from "near-api-js";
import { Near } from 'near-api-js';
import { NftType } from '../../../story/entities/nft-sale.entity';

@Injectable()
export class NearTestnetService implements Chain.ChainIntegration {
  public chain = 'near';
  public name = 'Near(testnet)';
  public taskModule: Chain.TaskModuleType = 'basic';
  public factoryAddress = '';
  public findsAddress = '';
  public enabled = true;
  public nearConnection = new Near({ networkId: 'testnet', nodeUrl: 'https://rpc.testnet.near.org' });
  public viewAccount;
  public contract;
  private logger = new Logger(NearTestnetService.name);

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
  ) {}

  async onModuleInit() {
    this.enabled = this._configSvc.get('NEAR_TESTNET_ENABLE') === 'true';
    if (!this.enabled) return;
    this.factoryAddress = this._configSvc.get(
      'NEAR_TESTNET_FACTORY_ADDRESS',
    );
    this.findsAddress = this._configSvc.get('NEAR_TESTNET_FINDS');
    const enableSync =
      this._configSvc.get('NEAR_TESTNET_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('NEAR_TESTNET_ENDPOINT');
    this.viewAccount = this._configSvc.get('NEAR_TESTNET_VIEW_ACCOUNT');

    const { connect, Contract } = nearAPI;
    const connectionConfig = {
      networkId: "testnet",
      nodeUrl: endpoint,
      walletUrl: "https://wallet.testnet.near.org",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://explorer.testnet.near.org",
    };
    this.nearConnection = await connect(connectionConfig);
    this.contract = new Contract(
      await this.nearConnection.account(this.viewAccount),
      this.factoryAddress,
      {
        viewMethods:["getStoryIdInfo", "getStoryIdNftSale", "get_nextStoryId"],
        changeMethods:[],
      }
    )

    if (enableSync) {
      this.syncChainData().catch((err) => {
        this.logger.error(`nearSync chain data failed`, err);
      });
    }
  }

  async isPkAccountMatched(pubkey: string, account: string): Promise<boolean> {
    return true;
  }

  async isValidSignature(
    params: Chain.IsValidSignatureParams,
  ): Promise<boolean> {
    return true;
  }

  async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    return metadatas.map((md) => ({
      item: md,
      json: {
        title: unescape(md.name),
        description: unescape(md.description),
        media: md.image,
        // Not required by the Near metadatas standard
        image: md.image,
      },
    }));
  }

  async getStory(chainStoryId: string): Promise<Chain.Story> {
    const storyIdInfo = await this.contract.getStoryIdInfo(
      {
        storyId: parseInt(chainStoryId),
      }
    );
    return {
      id: chainStoryId,
      cid: storyIdInfo.cid,
      author: storyIdInfo.author,
      addr: this.factoryAddress,
    };
  }
  async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const storyNftInfo = await this.contract.getStoryIdNftSale(
      {
        storyId: parseInt(chainStoryId),
      }
    );
    if (!storyNftInfo) return null;
    return {
      saleAddr: this.factoryAddress,
      name: storyNftInfo.name,
      uriPrefix: storyNftInfo.uriPrefix,
      type: '721',
      price: storyNftInfo.price.toString(),
      total: parseInt(storyNftInfo.total.toString()),
      authorClaimed: parseInt(storyNftInfo.authorClaimed.toString()),
      sold: parseInt(storyNftInfo.sold.toString()),
      authorReserved: parseInt(storyNftInfo.authorReserve.toString()),
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

  private async syncChainData() {
    /**
     * sync story data on chain every 30s
     */
    const INTERVALS = 30 * 1000;
    while (true) {
      try {

        this.logger.debug(`[nearSync] start`);
        const storiesInDb = await this._storySvc.listStories({
          chain: [this.chain],
        });
        const salesInDb = await this._storySvc.listNftSales({
          chain: [this.chain],
        });
        this.logger.debug(
          `[nearSync] ${storiesInDb.length} stories & ${salesInDb.length} sales in db`,
        );
        const nextStoryId = await this.contract.get_nextStoryId({});
        this.logger.debug(
          `[nearSync] there is ${nextStoryId - 1} stories on chain`
        );
        const toCreateStories: Parameters<StoryService['createStories']>[0] = [];
        const toUpdateStories: Parameters<StoryService['updateStoriesContentHash']>[0] = [];
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
                name: unescape(sale.name),
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
        this.logger.debug(
          `[nearSync] stories : ${toCreateStories.length} created ${toUpdateStories.length} updated`,
        );
        this.logger.debug(
          `[nearSync] sales : ${toCreateSales.length} created ${toUpdateSales.length} updated`,
        );
        await this._storySvc.createStories(toCreateStories);
        await this._storySvc.updateStoriesContentHash(toUpdateStories);
        await this._storySvc.createNftSales(toCreateSales);
        await this._storySvc.updateNftSales(toUpdateSales);
        this.logger.debug(`[nearSync] done`);
      }
      catch (e) {
        this.logger.error(`nearSync Near chain data failed`, e);
      }
      finally {
        await new Promise((res) => setTimeout(res, INTERVALS));
      }
    }
  }
}
