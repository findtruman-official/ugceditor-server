import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpfsModule } from 'src/ipfs/ipfs.module';
import { NftSale } from './entities/nft-sale.entity';
import { StoryChapter } from './entities/story-chapter.entity';
import { StoryInfo } from './entities/story-info.entity';
import { Story } from './entities/story.entity';
import { StorySyncProcessor } from './story-sync.processor';
import { StorySyncQueue } from './story.events';
import { StoryService } from './story.service';

/**
 * 监听:
 * 1. 故事创建
 * 2. 故事更新
 * 3. NFT发布
 * 4. NFT铸造
 * 5. NFT转账
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Story, NftSale, StoryInfo, StoryChapter]),
    BullModule.registerQueue({
      name: StorySyncQueue,
    }),
    IpfsModule,
  ],
  providers: [StoryService, StorySyncProcessor],
  exports: [StoryService],
})
export class StoryModule {}
