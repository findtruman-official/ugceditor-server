import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { StoryChapter } from '../models/story-chapter.model';
import { StoryInfo } from '../models/story-info.model';
import { StoryService } from 'src/story/story.service';

@Resolver(() => StoryChapter)
export class StoryChaptersResolver {
  constructor(private readonly _storySvc: StoryService) {}

  @ResolveField('info', () => StoryInfo)
  async getInfo(@Parent() info: StoryChapter): Promise<StoryInfo> {
    const chap = await this._storySvc.getStoryChapterById({
      chapId: info.id,
      withInfo: true,
    });
    return chap.storyInfo;
  }
}
