import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { TezosJakartanetService } from './tezos-jakartanet/tezos-jakartanet.service';
import { StoryChainTaskModule } from 'src/story-chain-task/story-chain-task.module';

@Module({
  imports: [ConfigModule, StoryModule, StoryChainTaskModule],
  providers: [TezosJakartanetService],
  exports: [TezosJakartanetService],
})
export class TezosModule {}
