import { Module } from '@nestjs/common';
import { StoryModule } from 'src/story/story.module';
import { ChainService } from './chain.service';
import { SolanaModule } from './solana/solana.module';
import { TezosModule } from './tezos/tezos.module';
import { KlaytnModule } from './klaytn/klaytn.module';
import { IcModule } from './ic/ic.module';

@Module({
  imports: [StoryModule, SolanaModule, TezosModule, KlaytnModule, IcModule],
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}
