import { registerEnumType } from '@nestjs/graphql';

export enum StoryTaskStatus {
  Todo = 'todo',
  Done = 'done',
  Cancelled = 'cancelled',
}

registerEnumType(StoryTaskStatus, {
  name: 'StoryTaskStatus',
});
