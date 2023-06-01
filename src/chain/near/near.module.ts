import { Module } from '@nestjs/common';
import { NearTestnetService } from './near-testnet/near-testnet.service';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from '../../story/story.module';
import { StoryChainTaskModule } from '../../story-chain-task/story-chain-task.module';

@Module({
  imports: [ConfigModule, StoryModule, StoryChainTaskModule],
  providers: [NearTestnetService],
  exports: [NearTestnetService]
})
export class NearModule {}
