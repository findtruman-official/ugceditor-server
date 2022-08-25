import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryTaskSubmit } from './entities/story-task-submit.entity';
import { StoryTask } from './entities/story-task.entity';
import { StoryTaskService } from './story-task.service';

@Module({
  imports: [TypeOrmModule.forFeature([StoryTask, StoryTaskSubmit])],
  providers: [StoryTaskService],
  exports: [StoryTaskService],
})
export class StoryTaskModule {}
