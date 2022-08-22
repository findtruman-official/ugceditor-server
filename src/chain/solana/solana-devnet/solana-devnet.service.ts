import { Injectable, Logger } from '@nestjs/common';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { decodeUTF8, decodeBase64 } from 'tweetnacl-util';
// import borsh from '@project-serum/borsh';
import {
  BorshCoder,
  utils,
  BN,
  Program,
  AnchorProvider,
  Wallet,
} from '@project-serum/anchor';

import IDL from '../solana-program.idl.json';
import { StoryService } from 'src/story/story.service';
import { NftType } from 'src/story/entities/nft-sale.entity';
import { ConfigService } from '@nestjs/config';
import { SolanaPrograms } from '../solana-program';

@Injectable()
export class SolanaDevnetService implements ChainIntegration {
  private _logger = new Logger(SolanaDevnetService.name);

  public readonly chain = 'solana-dev';
  public readonly name = 'Solana(Devnet)';
  public findsAddress = '';
  public factoryAddress = '';
  public enabled = false;

  private _conn: Connection = null;
  private _programId: PublicKey = null;
  private _storyFactoryAddr: PublicKey = null;
  private _coder = new BorshCoder(IDL as any);
  private _program: Program<SolanaPrograms> = null;

  constructor(
    private readonly _storySvc: StoryService,
    private readonly _configSvc: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled = this._configSvc.get('SOLANA_DEVNET_ENABLE') === 'true';
    this.enabled = enabled;
    if (!this.enabled) return;

    const enableSync =
      this._configSvc.get('SOLANA_DEVNET_ENABLE_SYNC') === 'true';
    const endpoint = this._configSvc.get('SOLANA_DEVNET_ENDPOINT');

    this._conn = new Connection(endpoint);
    this.factoryAddress = this._configSvc.get('SOLANA_DEVNET_PROGRAM_ID');

    this._programId = new PublicKey(this.factoryAddress);
    this._storyFactoryAddr = await this._getStoryFactoryAddr();

    this.findsAddress = this._configSvc.get('SOLANA_DEVNET_FINDS_ADDRESS');

    this._program = new Program<SolanaPrograms>(
      IDL as any,
      this._programId,
      new AnchorProvider(this._conn, new Wallet(Keypair.generate()), {}),
    );

    if (!enableSync) return;

    this._program.addEventListener('StoryUpdated', async (event, slot, sig) => {
      try {
        const storyId = smallBN2Number(event.id);
        this._logger.log(`Story Updated: ${storyId} ${slot} ${sig}`);
        const existed = await this._storySvc.getStory({
          chain: this.chain,
          chainStoryId: storyId.toString(),
        });
        if (existed) {
          this._logger.log(`updated story ${storyId}`);
          await this._syncUpdatedStory(storyId);
        } else {
          this._logger.log(`new published story ${storyId}`);
          await this._syncPublishedStory(storyId);
        }
      } catch (err) {
        this._logger.error(err);
        this._logger.error(
          `failed to handle StoryUpdated: ${event.id.toString()} ${slot} ${sig}`,
        );
      }
    });

    this._program.addEventListener(
      'StoryNftPublished',
      async (event, slot, sig) => {
        try {
          const storyId = smallBN2Number(event.id);
          this._logger.log(`Story Nft Published: ${storyId} ${slot} ${sig}`);
          const mintStateAddr = await this._getStoryNftSaleAddr(
            new BN(storyId),
          );
          const mintState = await this._program.account.storyNftMintState.fetch(
            mintStateAddr,
          );

          const obj = {
            chain: this.chain,
            chainStoryId: storyId.toString(),
            nftSaleAddr: mintStateAddr.toString(),
            total: smallBN2Number(mintState.total),
            price: mintState.price.toString(),
            sold: smallBN2Number(mintState.sold),
            authorReserved: smallBN2Number(mintState.authorReserved),
            authorClaimed: smallBN2Number(mintState.authorClaimed),
            uriPrefix: mintState.uriPrefix,
            name: mintState.title,
            type: NftType.NON_FUNGIBLE_TOKEN,
          };

          await this._storySvc.createNftSales([obj]);
        } catch (err) {
          this._logger.error(err);
          this._logger.error(
            `failed to handle StoryNftPublished: ${event.id.toString()} ${slot} ${sig}`,
          );
        }
      },
    );

    this._program.addEventListener('NftMinted', async (event, slot, sig) => {
      try {
        const storyId = smallBN2Number(event.storyId);
        const mintAddr = smallBN2Number(event.mint);
        this._logger.log(
          `Story Nft Minted: ${storyId} ${mintAddr.toString()} ${slot} ${sig}`,
        );

        const mintStateAddr = await this._getStoryNftSaleAddr(new BN(storyId));
        const mintState = await this._program.account.storyNftMintState.fetch(
          mintStateAddr,
        );

        const sale = await this._storySvc.getStoryNftSale({
          chain: this.chain,
          chainStoryId: storyId.toString(),
        });

        Object.assign(sale, {
          total: smallBN2Number(mintState.total),
          price: smallBN2Number(mintState.price),
          sold: smallBN2Number(mintState.sold),
          authorReserved: smallBN2Number(mintState.authorReserved),
          authorClaimed: smallBN2Number(mintState.authorClaimed),
          name: mintState.title,
          type: NftType.NON_FUNGIBLE_TOKEN,
        });

        await this._storySvc.updateNftSales([sale]);
      } catch (err) {
        this._logger.error(err);
        this._logger.error(
          `failed to handle NftMinted: ${event.storyId.toString()} ${event.mint.toString()} ${slot} ${sig}`,
        );
      }
    });

    this._loops({
      title: 'Scan New Stories',
      func: this._scanNewlyStory.bind(this),
      interval: 3600,
    });

    this._loops({
      title: 'Scan Updated Stories',
      func: this._scanUpdatedStory.bind(this),
      interval: 3600 * 2,
    });

    this._loops({
      title: 'Scan Published Story Nft Sales',
      func: this._scanPublishedNftSale.bind(this),
      interval: 3600,
    });

    this._loops({
      title: 'Scan Updated Story Nft Sales',
      func: this._scanUpdatedNftSale.bind(this),
      interval: 1800,
    });
  }

  async isValidSignature(params: IsValidSignatureParams): Promise<boolean> {
    return nacl.sign.detached.verify(
      decodeUTF8(params.message),
      decodeBase64(params.signature),
      new PublicKey(params.account).toBytes(),
    );
  }

  async formatGeneralMetadatas(
    metadatas: GeneralMetadata[],
  ): Promise<MetadataJsonFile[]> {
    return metadatas.map((md) => ({
      item: md,
      json: {
        name: md.name,
        symbol: 'Story',
        description: md.description,
        image: md.image,
      },
    }));
  }

  async getStory(chainStoryId: string): Promise<Story> {
    const storyAddr = await this._getStoryAddr(new BN(chainStoryId));
    const story = await this._program.account.story.fetchNullable(storyAddr);
    return story
      ? {
          id: story.id.toString(),
          cid: story.cid,
          author: story.author.toString(),
          addr: storyAddr.toString(),
        }
      : null;
  }

  async getStoryNftSale(chainStoryId: string): Promise<NftSale> {
    const addr = await this._getStoryNftSaleAddr(new BN(chainStoryId));
    const sale = await this._program.account.storyNftMintState.fetchNullable(
      addr,
    );
    return sale
      ? {
          name: sale.title,
          price: sale.price.toString(),
          sold: smallBN2Number(sale.sold),
          authorClaimed: smallBN2Number(sale.authorClaimed),
          authorReserved: smallBN2Number(sale.authorReserved),
          saleAddr: addr.toString(),
          uriPrefix: sale.uriPrefix,
          type: '721',
          total: smallBN2Number(sale.total),
        }
      : null;
  }

  private async _scanNewlyStory() {
    const factory = await this._program.account.storyFactory.fetch(
      this._storyFactoryAddr,
    );

    // const info = await this._conn.getAccountInfo(this._storyFactoryAddr);

    // const factory = this._coder.accounts.decode('StoryFactory', info.data);

    const existedStories = await this._storySvc.listStories({
      chain: [this.chain],
    });
    // console.log(this._storyFactoryAddr.toString());
    // console.log(info.data.toJSON());
    const existsStoryIds = existedStories.map((s) => parseInt(s.chainStoryId));

    const storyInfos: Parameters<StoryService['createStories']>[0] = [];
    for (let id = 1; id < parseInt(factory.nextId.toString()); id++) {
      if (existsStoryIds.includes(id)) {
        continue;
      }
      this._logger.log(`new story ${id}`);
      const storyAddr = await this._getStoryAddr(new BN(id));
      const storyData = await this._program.account.story.fetch(storyAddr);
      // const storyData = this._coder.accounts.decode(
      //   'Story',
      //   (await this._conn.getAccountInfo(storyAddr)).data,
      // );

      storyInfos.push({
        chain: this.chain,
        chainStoryId: id.toString(),
        author: storyData.author.toString(),
        onChainAddr: storyAddr.toString(),
        contentHash: storyData.cid,
      });
    }
    await this._storySvc.createStories(storyInfos);
  }

  private async _scanUpdatedStory() {
    const stories = await this._storySvc.listStories({ chain: [this.chain] });
    const toUpdate: {
      chain: string;
      chainStoryId: string;
      contentHash: string;
    }[] = [];

    for (const story of stories) {
      const storyData = await this._program.account.story.fetch(
        story.onChainAddr,
      );
      // const storyData = this._coder.accounts.decode(
      //   'Story',
      //   (await this._conn.getAccountInfo(new PublicKey(story.onChainAddr)))
      //     .data,
      // );
      // console.log(story.chainStoryId, story.contentHash, storyData.cid);
      if (story.contentHash !== storyData.cid) {
        toUpdate.push({
          chain: story.chain,
          chainStoryId: story.chainStoryId,
          contentHash: storyData.cid,
        });
        this._logger.log(`story updated ${story.chainStoryId}`);
      }
    }
    if (toUpdate.length) {
      await this._storySvc.updateStoriesContentHash(toUpdate);
    }
  }

  private async _scanPublishedNftSale() {
    const existedSales = await this._storySvc.listNftSales({
      chain: [this.chain],
    });
    const existedSaleStoryIdArr = existedSales.map((sale) =>
      parseInt(sale.chainStoryId),
    );

    // const info = await this._conn.getAccountInfo(
    //   new PublicKey(this._storyFactoryAddr),
    // );
    // const factory = this._coder.accounts.decode('StoryFactory', info.data);
    const factory = await this._program.account.storyFactory.fetch(
      this._storyFactoryAddr,
    );
    const nextId = parseInt(factory.nextId.toString());

    const toSave: Parameters<StoryService['createNftSales']>[0] = [];
    for (let id = 1; id < nextId; id++) {
      this._logger.debug(`check story ${id} mintState`);
      if (existedSaleStoryIdArr.includes(id)) {
        continue;
      }
      const mintStateAddr = await this._getStoryNftSaleAddr(new BN(id));
      const mintState =
        await this._program.account.storyNftMintState.fetchNullable(
          mintStateAddr,
        );
      if (!mintState) continue;
      toSave.push({
        chain: this.chain,
        chainStoryId: id.toString(),
        nftSaleAddr: mintStateAddr.toString(),

        total: smallBN2Number(mintState.total),
        price: mintState.price.toString(),
        sold: smallBN2Number(mintState.sold),
        authorReserved: smallBN2Number(mintState.authorReserved),
        authorClaimed: smallBN2Number(mintState.authorClaimed),
        uriPrefix: mintState.uriPrefix,
        name: mintState.title,
        type: NftType.NON_FUNGIBLE_TOKEN,
      });
    }
    if (toSave.length) {
      await this._storySvc.createNftSales(toSave);
    }
  }

  private async _scanUpdatedNftSale() {
    const existedSales = await this._storySvc.listNftSales({
      chain: [this.chain],
    });
    const toUpdate: Parameters<StoryService['updateNftSales']>[0] = [];
    for (const sale of existedSales) {
      const mintStateAddr = await this._getStoryNftSaleAddr(
        new BN(parseInt(sale.chainStoryId)),
      );
      // const mintStateInfo = await this._conn.getAccountInfo(mintStateAddr);
      // if (!mintStateInfo) continue; // maybe program closed
      // const mintState = this._coder.accounts.decode(
      //   'StoryNftMintState',
      //   mintStateInfo.data,
      // );
      const mintState =
        await this._program.account.storyNftMintState.fetchNullable(
          mintStateAddr,
        );
      // console.log();
      // console.log(mintState);
      if (!mintState) continue;
      Object.assign(sale, {
        total: smallBN2Number(mintState.total),
        price: mintState.price.toString(),
        sold: smallBN2Number(mintState.sold),
        authorReserved: smallBN2Number(mintState.authorReserved),
        authorClaimed: smallBN2Number(mintState.authorClaimed),
        // image: mintState.,
        // description: mintState.,
        name: mintState.title,
        type: NftType.NON_FUNGIBLE_TOKEN,
      });
      toUpdate.push(sale);
    }
    await this._storySvc.updateNftSales(toUpdate);
  }

  private async _syncPublishedStory(storyId: number) {
    const storyAddr = await this._getStoryAddr(new BN(storyId));

    const storyData = await this._program.account.story.fetch(storyAddr);
    // console.log(storyData);

    const storyInfo = {
      chain: this.chain,
      chainStoryId: storyId.toString(),
      author: storyData.author.toString(),
      onChainAddr: storyAddr.toString(),
      contentHash: storyData.cid,
    };

    await this._storySvc.createStories([storyInfo]);
  }

  private async _syncUpdatedStory(storyId: number) {
    const storyAddr = await this._getStoryAddr(new BN(storyId));
    const storyData = await this._program.account.story.fetch(storyAddr);

    await this._storySvc.updateStoriesContentHash([
      {
        chain: this.chain,
        chainStoryId: storyId.toString(),
        contentHash: storyData.cid,
      },
    ]);
  }

  private async _loops(params: {
    func: () => Promise<any>;
    interval: number;
    title: string;
  }) {
    while (true) {
      try {
        this._logger.debug(`start ${params.title}`);
        await params.func();
        this._logger.debug(`finish ${params.title}`);
      } catch (err) {
        this._logger.error(`run '${params.title}' failed`, err);
      }
      if (params.interval) {
        await new Promise((res) => setTimeout(res, params.interval * 1000));
      }
    }
  }

  private async _getStoryAddr(storyId: BN): Promise<PublicKey> {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(utils.bytes.utf8.encode('story-')),
          storyId.toBuffer('le', 8),
        ],
        this._programId,
      )
    )[0];
  }

  private async _getStoryFactoryAddr(): Promise<PublicKey> {
    return (
      await PublicKey.findProgramAddress(
        [Buffer.from(utils.bytes.utf8.encode('factory'))],
        this._programId,
      )
    )[0];
  }

  private async _getStoryNftSaleAddr(storyId: BN): Promise<PublicKey> {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(utils.bytes.utf8.encode('story-mint-')),
          storyId.toBuffer('le', 8),
        ],
        this._programId,
      )
    )[0];
  }
}

function smallBN2Number(bn: BN): number {
  return parseInt(bn.toString());
}
