import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import Caver, { Contract, EventData } from 'caver-js';
import EventEmitter from 'events';
import { readFile, writeFile } from 'fs/promises';
import { NftType } from 'src/story/entities/nft-sale.entity';
import { StoryService } from 'src/story/story.service';
import StoryFactoryAbi from '../story-factory.abi.json';
import StoryNftAbi from '../story-nft.abi.json';
import {
  KlaytnBaobabEventData,
  KlaytnBaobabEventQueue,
} from './klaytn-baobab.events';

@Injectable()
export class KlaytnBaobabService implements ChainIntegration {
  public chain = 'klaytn-baobab';
  public name = 'Klaytn(Baobab)';

  public factoryAddress: string;
  public findsAddress: string;
  public enabled: boolean;

  private _caver: Caver;
  private _factory: Contract;
  private _logger = new Logger(KlaytnBaobabService.name);
  private _resetNo = 1;

  constructor(
    private readonly _configSvc: ConfigService,
    private readonly _storySvc: StoryService,
    @InjectQueue(KlaytnBaobabEventQueue)
    private readonly _eventQueue: Queue<KlaytnBaobabEventData>,
  ) {}
  public async isValidSignature(
    params: IsValidSignatureParams,
  ): Promise<boolean> {
    return (
      params.account.toLocaleLowerCase() ==
      this._caver.klay.accounts
        .recover(params.message, params.signature)
        .toLowerCase()
    );
  }

  public async formatGeneralMetadatas(
    metadatas: GeneralMetadata[],
  ): Promise<MetadataJsonFile[]> {
    return metadatas.map((m) => ({
      item: m,
      json: {
        name: m.name,
        description: m.description,
        image: m.image,
      },
    }));
  }

  public async getStory(chainStoryId: string): Promise<Story> {
    const story = await this._factory.methods.stories(chainStoryId).call();
    if (story.id.toString() == '0') return null;
    return {
      id: chainStoryId,
      author: story.author,
      cid: story.cid,
      addr: this.factoryAddress, // no meanings, just use factory
    };
  }

  public async getStoryNftSale(chainStoryId: string): Promise<NftSale> {
    const sale = await this._factory.methods.sales(chainStoryId).call();
    if (sale.id.toString() == '0') return null;

    const nft = this._caver.contract.create(StoryNftAbi as any, sale.nft);

    return {
      authorClaimed: sale.authorClaimed,
      authorReserved: sale.authorReserved,
      total: sale.total,
      sold: sale.sold,
      saleAddr: this.factoryAddress, // no meanings, just use factory
      name: await nft.methods.name().call(),
      uriPrefix: await nft.methods.base().call(),
      type: '721',
      price: sale.price.toString(),
    };
  }

  async onModuleInit() {
    this.enabled = this._configSvc.get('KLAYTN_BAOBAB_ENABLE') === 'true';
    if (!this.enabled) return;

    this.factoryAddress = this._configSvc.get('KLAYTN_BAOBAB_FACTORY_ADDRESS');
    this.findsAddress = this._configSvc.get('KLAYTN_BAOBAB_FINDS');
    const enableSync =
      this._configSvc.get('KLAYTN_BAOBAB_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('KLAYTN_BAOBAB_ENDPOINT');
    this._caver = new Caver(endpoint);

    this._factory = this._caver.contract.create(
      StoryFactoryAbi as any,
      this.factoryAddress,
    );

    if (enableSync) {
      await this._resetListeners();
    }
  }

  private async _resetListeners() {
    const resetNo = this._resetNo++;
    this._logger.debug(`[${resetNo}] reset listeners`);
    const caver = new Caver(
      this._configSvc.get('KLAYTN_BAOBAB_LISTEN_ENDPOINT'),
    );

    const factory = caver.contract.create(
      StoryFactoryAbi as any,
      this.factoryAddress,
    );

    // StoryUpdated uint256 id, address author
    // StoryNftPublished uint256 id
    // StoryNftMinted uint256 id, address minter
    const vars = {
      timer: null,
    };
    const listeners = [
      {
        event: 'StoryUpdated',
        handler: async ({
          returnValues: { id, author },
          transactionHash,
          logIndex,
        }: EventData<{
          id: string;
          author: string;
        }>) => {
          await this._eventQueue.add(
            {
              type: 'story-updated',
              payload: { id, author },
            },
            {
              jobId: `${transactionHash}-${logIndex}`,
              attempts: 3,
            },
          );
        },
      },
      {
        event: 'StoryNftPublished',
        handler: async ({
          returnValues: { id },
          transactionHash,
          logIndex,
        }: EventData<{ id: string }>) => {
          await this._eventQueue.add(
            {
              type: 'story-nft-published',
              payload: { id },
            },
            {
              jobId: `${transactionHash}-${logIndex}`,
              attempts: 3,
            },
          );
        },
      },
      {
        event: 'StoryNftMinted',
        handler: async ({
          returnValues: { id, minter },
          transactionHash,
          logIndex,
        }: EventData<{
          id: string;
          minter: string;
        }>) => {
          await this._eventQueue.add(
            {
              type: 'story-nft-minted',
              payload: { id, minter },
            },
            {
              jobId: `${transactionHash}-${logIndex}`,
              attempts: 3,
            },
          );
        },
      },
    ];

    const emitters: Record<typeof listeners[0]['event'], EventEmitter> = {};

    const INTERVAL = 30000;
    const checkConn = async () => {
      try {
        const n = await caver.klay.getBlockNumber();
        this._logger.debug(`[${resetNo}] wss ping height: ${n}`);
        vars.timer = setTimeout(checkConn, INTERVAL);
      } catch (err) {
        this._logger.warn(err);
        this._logger.warn(`[${resetNo}] wss ping failed`);
        // prevent repeated resets
        if (this._resetNo === resetNo + 1) {
          cleanAndReset();
        }
      }
    };

    vars.timer = setTimeout(checkConn, INTERVAL);

    const cleanAndReset = () => {
      // remove all listeners
      // Avoid multiple listeners to repeatedly
      // handle exception logic
      Object.values(emitters).forEach((emitter) =>
        emitter.removeAllListeners(),
      );
      this._logger.debug(`[${resetNo}] reset listeners soon ...`);
      vars.timer && clearTimeout(vars.timer);

      setTimeout(this._resetListeners.bind(this), 1000);
    };

    for (const { event, handler } of listeners) {
      const emitter: EventEmitter = factory.events[event]({
        fromBlock: await this._getLastListenedBlock(event),
      });
      emitters[event] = emitter;
      emitter.on('data', (d: EventData<any>) => {
        this._setLastListenedBlock(event, d.blockNumber)
          .then(() => handler(d))
          .catch((err) => {
            this._logger.error(err);
          });
      });
      emitter.on('connected', (subId) => {
        this._logger.debug(
          `[${resetNo}] subscription ${event} connected ${subId}`,
        );
      });
      emitter.on('error', (err) => {
        this._logger.error(err);
        this._logger.error(`[${resetNo}] subscription ${event} errored`);

        cleanAndReset();
      });
    }
  }

  async handleStoryUpdatedEvent({ id }: { id: string }) {
    try {
      const storyId = id;
      this._logger.log(`Story Updated: ${storyId}`);
      const existed = await this._storySvc.getStory({
        chain: this.chain,
        chainStoryId: storyId,
      });
      if (existed) {
        this._logger.log(`updated story ${storyId}`);
        await this._syncUpdatedStory(parseInt(storyId));
      } else {
        this._logger.log(`new published story ${storyId}`);
        await this._syncPublishedStory(parseInt(storyId));
      }
    } catch (err) {
      this._logger.error(err);
      this._logger.error(`failed to handle StoryUpdated: ${id}`);
    }
  }

  async handleStoryNftPublishedEvent({ id }: { id: string }) {
    try {
      const storyId = id;
      this._logger.log(`Story Nft Published: ${storyId}`);

      const sale = await this.getStoryNftSale(storyId.toString());

      const obj = {
        chain: this.chain,
        chainStoryId: storyId.toString(),
        nftSaleAddr: this.factoryAddress,
        total: sale.total,
        price: sale.price,
        sold: sale.sold,
        authorReserved: sale.authorReserved,
        authorClaimed: sale.authorClaimed,
        uriPrefix: sale.uriPrefix,
        name: sale.name,
        type: NftType.NON_FUNGIBLE_TOKEN,
      };

      await this._storySvc.createNftSales([obj]);
    } catch (err) {
      this._logger.error(err);
      this._logger.error(`failed to handle StoryNftPublished: ${id}`);
    }
  }

  async handleStoryNftMintedEvent({
    id,
    minter,
  }: {
    id: string;
    minter: string;
  }) {
    try {
      const storyId = id;
      // const mintAddr = smallBN2Number(event.mint);
      this._logger.log(`Story Nft Minted: ${storyId} by ${minter}`);

      const sale = await this.getStoryNftSale(storyId.toString());

      const saleObj = await this._storySvc.getStoryNftSale({
        chain: this.chain,
        chainStoryId: storyId.toString(),
      });

      Object.assign(saleObj, {
        total: sale.total,
        price: sale.price,
        sold: sale.sold,
        authorReserved: sale.authorReserved,
        authorClaimed: sale.authorClaimed,
        name: sale.name,
        type: NftType.NON_FUNGIBLE_TOKEN,
      });

      await this._storySvc.updateNftSales([saleObj]);
    } catch (err) {
      this._logger.error(err);
      this._logger.error(`failed to handle NftMinted: ${id} by ${minter}`);
    }
  }

  private async _syncPublishedStory(storyId: number) {
    const storyData = await this.getStory(storyId.toString());

    const storyInfo = {
      chain: this.chain,
      chainStoryId: storyId.toString(),
      author: storyData.author,
      onChainAddr: this.factoryAddress,
      contentHash: storyData.cid,
    };

    await this._storySvc.createStories([storyInfo]);
  }

  private async _syncUpdatedStory(storyId: number) {
    const storyData = await this.getStory(storyId.toString());
    await this._storySvc.updateStoriesContentHash([
      {
        chain: this.chain,
        chainStoryId: storyId.toString(),
        contentHash: storyData.cid,
      },
    ]);
  }

  private _getLastListenedBlockFilename(event: string): string {
    return `.last-listen-block.${this.chain}.${event}`;
  }

  private async _getLastListenedBlock(event: string): Promise<number> {
    const initialBlock = parseInt(
      this._configSvc.get('KLAYTN_BAOBAB_FROM_BLOCK'),
    );
    try {
      const block = await readFile(this._getLastListenedBlockFilename(event), {
        encoding: 'ascii',
      });
      return block ? parseInt(block) : initialBlock;
    } catch (e) {
      return initialBlock;
    }
  }

  private async _setLastListenedBlock(
    event: string,
    block: number,
  ): Promise<void> {
    await writeFile(
      this._getLastListenedBlockFilename(event),
      block.toString(),
      { encoding: 'ascii' },
    );
  }
}
