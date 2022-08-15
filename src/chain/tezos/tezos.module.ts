import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { TezosGhostTestnetService } from './tezos-ghost-testnet/tezos-ghost-testnet.service';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [TezosGhostTestnetService],
  exports: [TezosGhostTestnetService],
})
export class TezosModule {}
