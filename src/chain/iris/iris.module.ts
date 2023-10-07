import { Module } from '@nestjs/common';
import { IrisTestnetService } from './iris-testnet/iris-testnet.service';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { StoryChainTaskModule } from 'src/story-chain-task/story-chain-task.module';

@Module({
  imports: [ConfigModule, StoryModule, StoryChainTaskModule],
  providers: [IrisTestnetService],
  exports: [IrisTestnetService],
})
export class IrisModule {}
