import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { DataSource, In, Repository } from 'typeorm';
import { NftSale } from './entities/nft-sale.entity';
import { StoryChapter } from './entities/story-chapter.entity';
import { StoryInfo } from './entities/story-info.entity';
import { Story } from './entities/story.entity';
import { StorySyncData, StorySyncQueue } from './story.events';

export enum StorySort {
  Hotest = 'hotest',
  Latest = 'latest',
}

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);
  constructor(
    private readonly datasource: DataSource,
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,

    @InjectRepository(NftSale)
    private readonly saleRepo: Repository<NftSale>,

    @InjectRepository(StoryInfo)
    private readonly infoRepo: Repository<StoryInfo>,

    @InjectRepository(StoryChapter)
    private readonly chapRepo: Repository<StoryChapter>,

    @InjectQueue(StorySyncQueue)
    private readonly syncQueue: Queue<StorySyncData>,
  ) {}

  async listStories({
    chain,
    author,
    sort = StorySort.Latest,
  }: {
    chain?: string[];
    author?: string[];
    sort?: StorySort;
  } = {}): Promise<Story[]> {
    let result = await this.storyRepo.find({
      where: {
        chain: chain && chain.length > 0 ? In(chain) : undefined,
        author: author && author.length > 0 ? In(author) : undefined,
      },
      order: { createTime: 'desc' },
    });
    if (sort === StorySort.Hotest) {
      const resultWithSold = await Promise.all(
        result.map(async (story) => {
          const sale = await this.saleRepo.findOneBy({
            chain: story.chain,
            chainStoryId: story.chainStoryId,
          });
          return {
            story,
            sale: sale ? sale.sold : 0,
          };
        }),
      );
      resultWithSold.sort((a, b) => b.sale - a.sale);
      result = resultWithSold.map((rs) => rs.story);
    }
    return result;
  }

  async getStory(params: {
    chain: string;
    chainStoryId: string;
  }): Promise<Story | null> {
    return await this.storyRepo.findOne({
      where: {
        chain: params.chain,
        chainStoryId: params.chainStoryId,
      },
    });
  }

  async createStories(
    stories: Omit<Story, 'updateTime' | 'createTime' | 'content'>[],
  ): Promise<Story[]> {
    return this.datasource.transaction(async (em) => {
      const storyRepo = em.getRepository(Story);

      const objs = await storyRepo.save(
        stories.map((story) => storyRepo.create(story)),
      );

      await Promise.all(
        objs.map(async (obj) =>
          this.createStoryInfoSyncTask({
            chain: obj.chain,
            chainStoryId: obj.chainStoryId,
          }),
        ),
      );

      return objs;
    });
  }

  async createStoryInfoSyncTask(data: StorySyncData) {
    return await this.syncQueue.add(data, {
      attempts: 5,
      timeout: 60 * 1000,
    });
  }

  async updateStoriesContentHash(
    data: {
      chain: string;
      chainStoryId: string;
      contentHash: string;
    }[],
  ): Promise<Story[]> {
    const stories = await this.datasource.transaction(async (em) => {
      const storyRepo = em.getRepository(Story);
      const stories: Story[] = [];
      for (const { chain, chainStoryId, contentHash } of data) {
        const story = await storyRepo.findOne({
          where: {
            chain,
            chainStoryId,
          },
        });
        if (!story) continue;
        if (story.contentHash !== contentHash) {
          story.contentHash = contentHash;
          stories.push(story);
        }
      }

      return await storyRepo.save(stories);
    });

    await Promise.all(
      stories.map(async (obj) =>
        this.createStoryInfoSyncTask({
          chain: obj.chain,
          chainStoryId: obj.chainStoryId,
        }),
      ),
    );

    return stories;
  }

  async getStoryNftSale(params: {
    chain: string;
    chainStoryId: string;
  }): Promise<NftSale | null> {
    return await this.saleRepo.findOne({
      where: {
        ...params,
      },
    });
  }
  async listNftSales({
    chain,
  }: {
    chain?: string[];
  } = {}): Promise<NftSale[]> {
    return await this.saleRepo.find({
      where: {
        chain: chain ? In(chain) : undefined,
      },
    });
  }
  async createNftSales(
    sales: Omit<NftSale, 'createTime' | 'updateTime'>[],
  ): Promise<NftSale[]> {
    return await this.datasource.transaction(async (em) => {
      const saleRepo = em.getRepository(NftSale);
      const saleObjs = sales.map((sale) => saleRepo.create(sale));
      return await saleRepo.save(saleObjs);
    });
  }
  async updateNftSales(
    sales: Omit<NftSale, 'createTime' | 'updateTime'>[],
  ): Promise<NftSale[]> {
    return await this.datasource.transaction(async (em) => {
      const saleRepo = em.getRepository(NftSale);
      const toSave: NftSale[] = [];
      for (const { chain, chainStoryId, nftSaleAddr, ...data } of sales) {
        const obj = await saleRepo.findOne({
          where: {
            chain,
            chainStoryId,
            nftSaleAddr,
          },
        });
        if (!obj) continue;
        if (
          obj.authorClaimed !== data.authorClaimed ||
          obj.authorReserved !== data.authorReserved ||
          obj.uriPrefix !== obj.uriPrefix ||
          obj.name !== data.name ||
          obj.total !== data.total ||
          obj.sold !== data.sold ||
          obj.price !== data.price ||
          obj.type !== data.type
        ) {
          Object.assign(obj, data);
          toSave.push(obj);
        }
      }
      return await saleRepo.save(toSave);
    });
  }

  async getStoryInfo(params: {
    chain: string;
    chainStoryId: string;
  }): Promise<StoryInfo> {
    const data = await this.infoRepo.findOne({ where: params });
    return data;
  }

  async getStoryInfoById(params: { id: number }): Promise<StoryInfo> {
    return await this.infoRepo.findOne({ where: { id: params.id } });
  }

  async listStoryChapters(params: { infoId: number }): Promise<StoryChapter[]> {
    return await this.chapRepo.find({
      where: {
        storyInfo: {
          id: params.infoId,
        },
      },
    });
  }

  async getStoryChapterById(params: {
    chapId: number;
    withInfo?: boolean;
  }): Promise<StoryChapter> {
    return await this.chapRepo.findOne({
      where: { id: params.chapId },
      relations: params.withInfo ? ['storyInfo'] : [],
    });
  }

  async updateStoryDetailsFromJson(params: {
    chain: string;
    chainStoryId: string;
    contentHash: string;
    json: StoryDetailsJson;
  }): Promise<StoryInfo | null> {
    const handlers = {
      '1': this._updateStoryDetailsFromJsonV1.bind(this),
    };
    const handler = handlers[params.json.version];
    if (!handler) {
      this.logger.error(JSON.stringify(params.json));
      this.logger.error(`invalid StoryDetailsJson`);
      return null;
    } else {
      return await handler(params);
    }
  }

  private async _updateStoryDetailsFromJsonV1(params: {
    chain: string;
    chainStoryId: string;
    contentHash: string;
    json: StoryDetailsJsonV1;
  }): Promise<StoryInfo> {
    return await this.datasource.transaction(async (em) => {
      const infoRepo = em.getRepository(StoryInfo);
      const chapRepo = em.getRepository(StoryChapter);
      const { chain, chainStoryId, contentHash, json } = params;
      let infoObj = await infoRepo.findOne({
        where: {
          chain,
          chainStoryId,
        },
      });
      if (!infoObj) {
        infoObj = infoRepo.create({ chain, chainStoryId });
      }
      infoObj.contentHash = contentHash;
      infoObj.cover = json.cover;
      infoObj.description = json.description;
      infoObj.title = json.title;
      infoObj.updateAt = new Date(json.updateAt);
      infoObj.createAt = new Date(json.createAt);
      infoObj = await infoRepo.save(infoObj);

      await chapRepo.remove(
        await chapRepo.find({
          where: {
            storyInfo: {
              id: infoObj.id,
            },
          },
        }),
      );
      const chapters = json.chapters.map((chap) =>
        chapRepo.create({
          name: chap.name,
          content: chap.content,
          createAt: new Date(chap.createAt),
          updateAt: new Date(chap.updateAt),
          storyInfo: infoObj,
        }),
      );
      await chapRepo.save(chapters);

      return infoObj;
    });
  }
}

type StoryDetailsJson = StoryDetailsJsonV1;

type StoryDetailsJsonV1 = {
  version: '1';
  title: string;
  cover: string;
  description: string;
  chapters: {
    name: string;
    content: string;
    createAt: number;
    updateAt: number;
  }[];
  createAt: number;
  updateAt: number;
};
