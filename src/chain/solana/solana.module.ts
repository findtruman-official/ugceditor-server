import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { SolanaDevnetService } from './solana-devnet.service';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [SolanaDevnetService],
  exports: [SolanaDevnetService],
})
export class SolanaModule {}
