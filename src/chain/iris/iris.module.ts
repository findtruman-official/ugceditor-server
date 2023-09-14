import { Module } from '@nestjs/common';
import { IrisTestnetService } from './iris-testnet/iris-testnet.service';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [IrisTestnetService],
})
export class IrisModule {}
