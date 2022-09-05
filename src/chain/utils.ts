import { StoryChainTaskSubmitStatus } from 'src/story-chain-task/entities/story-chain-task-submit.entity';
import { StoryChainTaskStatus } from 'src/story-chain-task/entities/story-chain-task.entity';

export function chain2ett_TaskStatus(
  status: Chain.Task['status'],
): StoryChainTaskStatus {
  // switch (status) {
  //   case 'TODO':
  //     return StoryChainTaskStatus.Todo;
  //   case 'CANCELLED':
  //     return StoryChainTaskStatus.Cancelled;
  //   case 'DONE':
  //     return StoryChainTaskStatus.Done;
  //   default:
  //     console.error(status);
  //     throw new Error('invalid status');
  // }
  const map: Record<Chain.Task['status'], StoryChainTaskStatus> = {
    TODO: StoryChainTaskStatus.Todo,
    CANCELLED: StoryChainTaskStatus.Cancelled,
    DONE: StoryChainTaskStatus.Done,
  };
  return map[status];
}

export function chain2ett_SubmitStatus(
  status: Chain.Submit['status'],
): StoryChainTaskSubmitStatus {
  const map: Record<Chain.Submit['status'], StoryChainTaskSubmitStatus> = {
    PENDING: StoryChainTaskSubmitStatus.PENDING,
    APPROVED: StoryChainTaskSubmitStatus.APPROVED,
    REJECTED: StoryChainTaskSubmitStatus.REJECTED,
    WITHDRAWED: StoryChainTaskSubmitStatus.WITHDRAWED,
  };
  return map[status];
}
