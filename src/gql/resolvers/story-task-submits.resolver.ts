import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { Ident } from 'src/core/decorators/ident.decorator';
import { IdentGuard } from 'src/core/guards/ident.guard';
import { UserIdent } from 'src/core/middleware/user-ident';
import { StoryTaskService } from 'src/story-task/story-task.service';
import { CreateTaskSubmitArgs } from '../dto/create-task-submit.args';
import { StoryTaskSubmit } from '../models/story-task-submit.model';

@Resolver(() => StoryTaskSubmit)
export class StoryTaskSubmitsResolver {
  constructor(private readonly _storyTaskSvc: StoryTaskService) {}

  @UseGuards(IdentGuard)
  @Mutation(() => StoryTaskSubmit)
  async createTaskSubmit(
    @Args() info: CreateTaskSubmitArgs,
    @Ident() ident: UserIdent,
  ): Promise<StoryTaskSubmit> {
    await this._assertTaskChainMatch(info.taskId, ident);
    return {
      ...(await this._storyTaskSvc.createStoryTaskSubmit({
        taskId: info.taskId,
        account: ident.account,
        content: info.content,
      })),
      taskId: info.taskId,
    };
  }

  @UseGuards(IdentGuard)
  @Mutation(() => Boolean)
  async removeTaskSubmit(
    @Args('id', { type: () => Int }) id: number,
    @Ident() ident: UserIdent,
  ): Promise<boolean> {
    const obj = await this._storyTaskSvc.getStoryTaskSubmit(id);
    if (obj.account !== ident.account) {
      throw new Error('not creator of submit');
    }
    await this._storyTaskSvc.removeStoryTaskSubmit({ submitId: id });
    return false;
  }

  async _assertTaskChainMatch(taskId: number, ident: UserIdent) {
    const task = await this._storyTaskSvc.getStoryTask(taskId);
    // console.log(taskId, ident, task);
    if (task.chain !== ident.chain) {
      throw new Error('invalid chain');
    }
  }
}
