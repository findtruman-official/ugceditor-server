import { Injectable, Logger } from '@nestjs/common';
import {
  Contract,
  JsonRpcProvider,
  computeAddress,
  verifyMessage,
} from 'ethers';
import StoryFactoryAbi from '../story-factory.abi.json';
import StoryNftAbi from '../story-nft.abi.json';
import { ConfigService } from '@nestjs/config';
import { StoryService } from 'src/story/story.service';
import { NftType } from 'src/story/entities/nft-sale.entity';

@Injectable()
export class IrisTestnetService implements Chain.ChainIntegration {
  public chain = 'iris';
  public name = 'iris';
  public taskModule: Chain.TaskModuleType = 'chain';
  public factoryAddress = '';
  public findsAddress = '';
  public enabled = true;

  private _provider: JsonRpcProvider;
  private _factory: Contract;

  private _logger = new Logger(IrisTestnetService.name);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(
    private readonly _configSvc: ConfigService,
    private readonly _storySvc: StoryService,
  ) {}

  async onModuleInit() {
    this.enabled = this._configSvc.get('IRIS_ENABLE') === 'true';
    if (!this.enabled) return;
    const enableSync = this._configSvc.get('IRIS_ENABLE_SYNC') === 'true';
    this.factoryAddress = this._configSvc.get('IRIS_FACTORY_ADDRESS');

    const endpoint = this._configSvc.get('IRIS_ENDPOINT');
    this._provider = new JsonRpcProvider(endpoint);
    this._factory = new Contract(
      this.factoryAddress,
      StoryFactoryAbi as any,
      this._provider,
    );

    if (enableSync) {
      this._loop().catch((err) => {
        this._logger.error('failed to listen', err);
      });
    }

    // console.log(
    //   await this.isPkAccountMatched(
    //     '1a1d2ba79a3be9ca6c2933d09a144a856f79fee899ef7e57d93c13c536cfae9d',
    //     '0x3fad7Aa56bb74985cE1b98e1f6d26fF7f7c28dF3',
    //   ),
    // );
    // const z = await this._factory.stories('1');
    // console.log(z);
  }

  async isPkAccountMatched(pubkey: string, account: string): Promise<boolean> {
    const address = computeAddress('0x' + pubkey);
    if (address == account) {
      return true;
    }
    return false;
  }

  async isValidSignature(
    params: Chain.IsValidSignatureParams,
  ): Promise<boolean> {
    const address = verifyMessage(params.message, params.signature);
    if (address == params.account) {
      return true;
    }
    return false;
  }

  public async formatGeneralMetadatas(
    metadatas: Chain.GeneralMetadata[],
  ): Promise<Chain.MetadataJsonFile[]> {
    return metadatas.map((m) => ({
      item: m,
      json: {
        name: m.name,
        description: m.description,
        image: m.image,
      },
    }));
  }

  public async getStory(chainStoryId: string): Promise<Chain.Story> {
    const story = await this._factory.stories(chainStoryId);
    // if (story.id.toString() == '0') return null;
    return {
      id: chainStoryId,
      author: story.author,
      cid: story.cid,
      addr: this.factoryAddress,
    };
  }

  public async getStoryNftSale(chainStoryId: string): Promise<Chain.NftSale> {
    const sale = await this._factory.sales(chainStoryId);
    const nft = new Contract(sale.nft, StoryNftAbi as any, this._provider);
    return {
      authorClaimed: sale.authorClaimed,
      authorReserved: sale.authorReserved,
      total: sale.total,
      sold: sale.sold,
      saleAddr: this.factoryAddress,
      name: await nft.name(),
      uriPrefix: await nft.base(),
      type: '721',
      price: sale.price.toString(),
    };
  }

  async getTask(
    chainStoryId: string,
    chainTaskId: string,
  ): Promise<Chain.Task> {
    const result = await this._factory.getTask(chainStoryId, chainTaskId);
    if (result.id == '0') return null;
    const status = ['TODO', 'DONE', 'CANCELLED'][
      parseInt(result.status)
    ] as Chain.Task['status'];
    return {
      id: chainTaskId,
      cid: result.cid,
      creator: result.creator,
      nft: result.nft,
      rewardNfts: result.rewardNfts.map((v) => v.toString()),
      status: status,
    };
  }

  async getSubmit(
    chainStoryId: string,
    chainTaskId: string,
    chainSubmitId: string,
  ): Promise<Chain.Submit> {
    const result = await this._factory.getSubmit(
      chainStoryId,
      chainTaskId,
      chainSubmitId,
    );
    if (result.id == '0') return null;
    const status = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWED'][
      parseInt(result.status)
    ] as Chain.Submit['status'];
    return {
      id: chainTaskId,
      cid: result.cid,
      creator: result.creator,
      status: status,
    };
  }

  private async _loop() {
    const endpoint = this._configSvc.get('IRIS_ENDPOINT');
    const IRIS_LOOP_INTERVAL = this._configSvc.get('IRIS_LOOP_INTERVAL');
    const provider = new JsonRpcProvider(endpoint);
    const factory = new Contract(
      this.factoryAddress,
      StoryFactoryAbi as any,
      provider,
    );

    // 比较当前区块高度和设定开始高度
    let start_block = +this._configSvc.get('IRIS_FROM_BLOCK');
    while (true) {
      try {
        const now_block = await provider.getBlockNumber();
        this._logger.log(`Deal: ${start_block} => ${now_block}`);
        // 故事更新事件
        const blockStoryUpdatedInfo = await factory.queryFilter(
          'StoryUpdated',
          start_block,
          now_block,
        );
        for (let i = 0; i < blockStoryUpdatedInfo.length; i++) {
          const updateStoryId = parseInt(blockStoryUpdatedInfo[i].topics[1]);
          const storyAuthor = blockStoryUpdatedInfo[i].topics[2].replace(
            '000000000000000000000000',
            '',
          );
          await this.storyUpdatedEvent({ id: updateStoryId.toString() });
        }
        // NFT发布事件
        const blockStoryNftPublishedInfo = await factory.queryFilter(
          'StoryNftPublished',
          start_block,
          now_block,
        );
        for (let i = 0; i < blockStoryNftPublishedInfo.length; i++) {
          const publishStoryId = parseInt(
            blockStoryNftPublishedInfo[i].topics[1],
          );
          await this.storyNftPublishedEvent({ id: publishStoryId.toString() });
        }
        // NFT Mint事件
        const blockStoryNftMintedInfo = await factory.queryFilter(
          'StoryNftMinted',
          start_block,
          now_block,
        );
        for (let i = 0; i < blockStoryNftMintedInfo.length; i++) {
          const mintStoryId = parseInt(blockStoryNftMintedInfo[i].topics[1]);
          const minter = blockStoryNftMintedInfo[i].topics[2].replace(
            '000000000000000000000000',
            '',
          );
          await this.storyNftMintedEvent({
            id: mintStoryId.toString(),
            minter: minter,
          });
        }
        // 用户铸造自留NFT事件
        const blockAuthorClaimedInfo = await factory.queryFilter(
          'AuthorClaimed',
          start_block,
          now_block,
        );
        for (let i = 0; i < blockAuthorClaimedInfo.length; i++) {
          const claimStoryId = parseInt(blockAuthorClaimedInfo[i].topics[1]);
          const claimAmount = parseInt(blockAuthorClaimedInfo[i].topics[2]);
          await this.authorClaimedEvent({
            storyId: claimStoryId.toString(),
            amount: claimAmount.toString(),
          });
        }
        start_block = now_block;
      } catch (err) {
        this._logger.error('listen failed, try next loop', err);
      }
      await new Promise((res) => setTimeout(res, IRIS_LOOP_INTERVAL * 1000));
    }
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

  private async storyUpdatedEvent({ id }: { id: string }) {
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

  private async storyNftPublishedEvent({ id }: { id: string }) {
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

  async storyNftMintedEvent({ id, minter }: { id: string; minter: string }) {
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

  async authorClaimedEvent({
    storyId,
    amount,
  }: {
    storyId: string;
    amount: string;
  }) {
    // try {
    this._logger.log(`AuthorClaimed: storyId=${storyId}, amount=${amount}`);
    const obj = await this._storySvc.getStoryNftSale({
      chain: this.chain,
      chainStoryId: storyId,
    });
    obj.authorClaimed = (await this.getStoryNftSale(storyId)).authorClaimed;
    await this._storySvc.updateNftSales([obj]);
  }
}
