import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { TezosJakartanetService } from './tezos-jakartanet/tezos-jakartanet.service';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [TezosJakartanetService],
  exports: [TezosJakartanetService],
})
export class TezosModule {}
