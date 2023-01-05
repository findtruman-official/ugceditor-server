import { Module } from '@nestjs/common';
import { NearTestnetService } from './near-testnet/near-testnet.service';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from '../../story/story.module';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [NearTestnetService],
  exports: [NearTestnetService]
})
export class NearModule {}
