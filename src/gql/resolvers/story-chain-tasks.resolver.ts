import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { StoryChainTaskService } from 'src/story-chain-task/story-chain-task.service';
import { ChainTaskIdArgs } from '../dto/chain-task-id.args';
import { StoryIdArgs } from '../dto/story-id.args';
import { StoryChainTaskSubmit } from '../models/story-chain-submit.model';
import { StoryChainTask } from '../models/story-chain-task.model';
import { ett2mdl_ChainSubmit, ett2mdl_ChainTask } from '../utils';

@Resolver(() => StoryChainTask)
export class StoryChainTasksResolver {
  constructor(private readonly _svc: StoryChainTaskService) {}

  @Query(() => [StoryChainTask])
  async chainTasks(@Args() args: StoryIdArgs): Promise<StoryChainTask[]> {
    return (await this._svc.listTasks(args)).map(ett2mdl_ChainTask);
  }

  @Query(() => StoryChainTask, { nullable: true })
  async chainTask(@Args() args: ChainTaskIdArgs): Promise<StoryChainTask> {
    const task = await this._svc.getTask(args);
    if (task) {
      return ett2mdl_ChainTask(task);
    }
    return undefined;
  }

  @ResolveField('submits', () => [StoryChainTaskSubmit])
  async getSubmits(
    @Parent() task: StoryChainTask,
  ): Promise<StoryChainTaskSubmit[]> {
    return (
      await this._svc.listSubmits({
        chain: task.chain,
        chainStoryId: task.chainStoryId,
        chainTaskId: task.chainTaskId,
      })
    ).map(ett2mdl_ChainSubmit);
  }

  @ResolveField('account', () => String)
  getAccount(@Parent() task: StoryChainTask) {
    return task.creator;
  }
}
