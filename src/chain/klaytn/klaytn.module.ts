import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoryModule } from 'src/story/story.module';
import { KlaytnBaobabService } from './klaytn-baobab/klaytn-baobab.service';

@Module({
  imports: [ConfigModule, StoryModule],
  providers: [KlaytnBaobabService],
  exports: [KlaytnBaobabService],
})
export class KlaytnModule {}
