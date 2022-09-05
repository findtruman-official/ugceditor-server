import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryChainTaskModule } from 'src/story-chain-task/story-chain-task.module';
import { StoryModule } from 'src/story/story.module';
import { KlaytnBaobabEventQueue } from './klaytn-baobab/klaytn-baobab.events';
import { KlaytnBaobabEventProcessor } from './klaytn-baobab/klaytn-baobab.processor';
import { KlaytnBaobabService } from './klaytn-baobab/klaytn-baobab.service';

@Module({
  imports: [
    ConfigModule,
    StoryModule,
    StoryChainTaskModule,
    BullModule.registerQueue({
      name: KlaytnBaobabEventQueue,
    }),
  ],
  providers: [KlaytnBaobabService, KlaytnBaobabEventProcessor],
  exports: [KlaytnBaobabService],
})
export class KlaytnModule {}
