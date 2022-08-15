import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ChainService } from 'src/chain/chain.service';
import { IpfsService } from 'src/ipfs/ipfs.service';
import { StoryService, StorySort } from 'src/story/story.service';
import { Chain } from '../models/chain.model';
import { IpfsResult } from '../models/ipfs-result.model';
import { NftSale } from '../models/nft-sale.model';
import { StoryChapter } from '../models/story-chapter.model';
import { StoryInfo } from '../models/story-info.model';
import { Story } from '../models/story.model';

registerEnumType(StorySort, {
  name: 'StorySort',
});

@Resolver(() => Story)
export class StoriesResolver {
  constructor(
    private readonly _chainSvc: ChainService,
    private readonly _storySvc: StoryService,
    private readonly _ipfsSvc: IpfsService,
  ) {}

  @Mutation(() => IpfsResult, {
    name: 'metadataUriPrefix',
  })
  async mutMetadataUriPrefix(
    @Args('name') name: string,
    @Args('description') description: string,
    @Args('image') image: string,
    @Args('chain') chain: string,
    @Args('amount', { type: () => Int }) amount: number,
  ): Promise<IpfsResult> {
    if (amount >= 10000) {
      throw new Error('amount too large');
    }

    const imageWithProtocol = image.startsWith('ipfs://')
      ? image
      : 'ipfs://' + image;

    const metaDataJsons = await this._chainSvc.formatGeneralMetadatas(
      chain,
      new Array(amount).fill(0).map((_, idx) => ({
        tokenId: idx + 1,
        name: `${name} #${idx + 1}`,
        image: imageWithProtocol,
        description: description,
      })),
    );
    const { cid } = await this._ipfsSvc.uploadMultiJson(
      metaDataJsons.map(({ item, json }) => ({
        filename: `${item.tokenId}.json`,
        json,
      })),
    );
    return {
      cid,
      url: 'ipfs://' + cid,
    };
  }

  @Query(() => [Story], {
    name: 'stories',
  })
  async queryStories(
    @Args('chain', { type: () => [String], nullable: true }) chain: string[],
    @Args('author', { type: () => [String], nullable: true }) author: string[],
    @Args('sort', { type: () => StorySort, nullable: true }) sort: StorySort,
  ) {
    return this._storySvc.listStories({
      chain,
      author,
      sort,
    });
  }

  @Query(() => Story, { nullable: true, name: 'story' })
  async queryStory(
    @Args('chain') chain: string,
    @Args('chainStoryId') chainStroyId: string,
  ): Promise<Story> {
    return await this._storySvc.getStory({ chain, chainStroyId });
  }

  @Query(() => StoryChapter, {
    name: 'chapter',
  })
  async queryChapter(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<StoryChapter> {
    return await this._storySvc.getStoryChapterById({ chapId: id });
  }

  @ResolveField('chainInfo', () => Chain)
  async getChain(@Parent() story: Story): Promise<Chain> {
    return await this._chainSvc.getChainInfo(story.chain);
  }

  @ResolveField('nft', () => NftSale, { nullable: true })
  async getNft(@Parent() story: Story): Promise<NftSale> {
    return await this._storySvc.getStoryNftSale({
      chain: story.chain,
      chainStoryId: story.chainStoryId,
    });
  }

  @ResolveField('info', () => StoryInfo, { nullable: true })
  async getInfo(@Parent() story: Story): Promise<StoryInfo> {
    const { chain, chainStoryId } = story;
    const info = await this._storySvc.getStoryInfo({
      chain,
      chainStoryId,
    });

    return info;
  }
}
