import {
  StoryChainTask as StoryChainTaskEtt,
  StoryChainTaskStatus as StoryChainTaskStatusEtt,
} from 'src/story-chain-task/entities/story-chain-task.entity';

import {
  StoryChainTaskSubmit as StoryChainTaskSubmitEtt,
  StoryChainTaskSubmitStatus as StoryChainTaskSubmitStatusEtt,
} from 'src/story-chain-task/entities/story-chain-task-submit.entity';

import {
  StoryChainTask,
  StoryChainTaskStatus,
} from './models/story-chain-task.model';
import {
  StoryChainTaskSubmit,
  StoryChainTaskSubmitStatus,
} from './models/story-chain-submit.model';

export function ett2mdl_ChainTaskStatus(
  status: StoryChainTaskStatusEtt,
): StoryChainTaskStatus {
  const map: Record<StoryChainTaskStatusEtt, StoryChainTaskStatus> = {
    [StoryChainTaskStatusEtt.Todo]: StoryChainTaskStatus.Todo,
    [StoryChainTaskStatusEtt.Done]: StoryChainTaskStatus.Done,
    [StoryChainTaskStatusEtt.Cancelled]: StoryChainTaskStatus.Cancelled,
  };
  return map[status];
}

export function ett2mdl_ChainTask(t: StoryChainTaskEtt): StoryChainTask {
  return {
    ...t,
    description: t.content,
    status: ett2mdl_ChainTaskStatus(t.status),
  };
}

export function ett2mdl_ChainSubmitStatus(
  status: StoryChainTaskSubmitStatusEtt,
): StoryChainTaskSubmitStatus {
  const map: Record<StoryChainTaskSubmitStatusEtt, StoryChainTaskSubmitStatus> =
    {
      [StoryChainTaskSubmitStatusEtt.PENDING]:
        StoryChainTaskSubmitStatus.Pending,
      [StoryChainTaskSubmitStatusEtt.APPROVED]:
        StoryChainTaskSubmitStatus.Approved,
      [StoryChainTaskSubmitStatusEtt.REJECTED]:
        StoryChainTaskSubmitStatus.Rejected,
      [StoryChainTaskSubmitStatusEtt.WITHDRAWED]:
        StoryChainTaskSubmitStatus.Withdrawed,
    };
  return map[status];
}

export function ett2mdl_ChainSubmit(
  t: StoryChainTaskSubmitEtt,
): StoryChainTaskSubmit {
  return {
    ...t,
    status: ett2mdl_ChainSubmitStatus(t.status),
  };
}
