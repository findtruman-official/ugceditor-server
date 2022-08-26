import { Controller, Get, Param } from '@nestjs/common';
import { StoryService } from './story.service';

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get('sync/:chain/:chainStoryId')
  async syncStoryInfo(
    @Param('chain') chain: string,
    @Param('chainStoryId') chainStoryId,
  ): Promise<boolean> {
    const story = await this.storyService.getStory({ chain, chainStoryId });
    if (story) {
      await this.storyService.createStoryInfoSyncTask({ chain, chainStoryId });
      return true;
    } else {
      return false;
    }
  }
}
