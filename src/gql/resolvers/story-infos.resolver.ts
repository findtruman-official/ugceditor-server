import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { StoryService } from 'src/story/story.service';
import { StoryChapter } from '../models/story-chapter.model';
import { StoryInfo } from '../models/story-info.model';

@Resolver(() => StoryInfo)
export class StoryInfosResolver {
  constructor(private readonly _storySvc: StoryService) {}

  @ResolveField('chapters', () => [StoryChapter])
  async getChapters(@Parent() info: StoryInfo): Promise<StoryChapter[]> {
    return await this._storySvc.listStoryChapters({
      infoId: info.id,
    });
  }
}
