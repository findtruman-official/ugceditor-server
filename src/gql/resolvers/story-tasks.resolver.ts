import { UseGuards } from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Ident } from 'src/core/decorators/ident.decorator';
import { IdentGuard } from 'src/core/guards/ident.guard';
import { UserIdent } from 'src/core/middleware/user-ident';
import { StoryTaskService } from 'src/story-task/story-task.service';
import { StoryService } from 'src/story/story.service';
import { CreateStoryTaskArgs } from '../dto/create-story-task.args';
import { StoryIdArgs } from '../dto/story-id.args';
import { UpdateStoryTaskArgs } from '../dto/update-story-task.args';
import { StoryTaskSubmit } from '../models/story-task-submit.model';
import { StoryTask } from '../models/story-task.model';

@Resolver(() => StoryTask)
export class StoryTasksResolver {
  constructor(
    private readonly _storySvc: StoryService,
    private readonly _storyTaskSvc: StoryTaskService,
  ) {}

  @Query(() => StoryTask, { nullable: true })
  async storyTask(@Args('id') id: number): Promise<StoryTask> {
    return await this._storyTaskSvc.getStoryTask(id);
  }

  @Query(() => [StoryTask], {
    nullable: false,
  })
  async storyTasks(
    @Args() { chain, chainStoryId }: StoryIdArgs,
  ): Promise<StoryTask[]> {
    return await this._storyTaskSvc.listStoryTasks({ chain, chainStoryId });
  }

  @UseGuards(IdentGuard)
  @Mutation(() => StoryTask)
  async createStoryTask(
    @Args() info: CreateStoryTaskArgs,
    @Ident() ident: UserIdent,
  ): Promise<StoryTask> {
    const story = await this._storySvc.getStory({
      chain: info.chain,
      chainStoryId: info.chainStoryId,
    });
    this._assertAccount({ account: story.author, chain: story.chain }, ident);
    return await this._storyTaskSvc.createStoryTask(info);
  }
  @UseGuards(IdentGuard)
  @Mutation(() => StoryTask)
  async updateStoryTask(
    @Args() info: UpdateStoryTaskArgs,
    @Ident() ident: UserIdent,
  ): Promise<StoryTask> {
    await this._assertTaskOperatePermission(info.id, ident);
    return await this._storyTaskSvc.updateStoryTask(info);
  }
  @UseGuards(IdentGuard)
  @Mutation(() => StoryTask)
  async cancelStoryTask(
    @Args('id') id: number,
    @Ident() ident: UserIdent,
  ): Promise<StoryTask> {
    await this._assertTaskOperatePermission(id, ident);
    return await this._storyTaskSvc.cancelStoryTask(id);
  }
  @UseGuards(IdentGuard)
  @Mutation(() => StoryTask)
  async doneStoryTask(
    @Args('id') id: number,
    @Args('submitIds', { type: () => [Int] }) submitIds: number[],
    @Ident() ident: UserIdent,
  ): Promise<StoryTask> {
    await this._assertTaskOperatePermission(id, ident);
    return this._storyTaskSvc.doneStoryTask({ id, submitIds });
  }

  @ResolveField('submits', () => [StoryTaskSubmit])
  async getSubmits(@Parent() task: StoryTask): Promise<StoryTaskSubmit[]> {
    return (await this._storyTaskSvc.listStoryTaskSubmits(task.id)).map(
      (submit) => ({ ...submit, taskId: task.id }),
    );
  }

  async _assertTaskOperatePermission(taskId: number, ident: UserIdent) {
    const task = await this._storyTaskSvc.getStoryTask(taskId);
    const story = await this._storySvc.getStory({
      chain: task.chain,
      chainStoryId: task.chainStoryId,
    });

    this._assertAccount({ account: story.author, chain: story.chain }, ident);
  }

  private _assertAccount(
    expected: { chain: string; account: string },
    current: { chain: string; account: string },
  ) {
    if (
      expected.account.toLowerCase() !== current.account.toLowerCase() ||
      expected.chain !== current.chain
    ) {
      throw new Error('chain or account is wrong');
    }
  }
}
