import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpfsModule } from 'src/ipfs/ipfs.module';
import { StoryChainTaskSubmit } from './entities/story-chain-task-submit.entity';
import { StoryChainTask } from './entities/story-chain-task.entity';
import { StoryChainTaskService } from './story-chain-task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoryChainTask, StoryChainTaskSubmit]),
    IpfsModule,
  ],
  providers: [StoryChainTaskService],
  exports: [StoryChainTaskService],
})
export class StoryChainTaskModule {}
