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
import { StoryController } from './story.controller';

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
  controllers: [StoryController],
})
export class StoryModule {}
