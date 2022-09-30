import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryChainTaskModule } from 'src/story-chain-task/story-chain-task.module';
import { StoryModule } from 'src/story/story.module';
import { IcService } from './ic.service';

@Module({
  imports: [ConfigModule, StoryModule, StoryChainTaskModule],
  providers: [IcService],
  exports: [IcService],
})
export class IcModule {}
