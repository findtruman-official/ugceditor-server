import { registerEnumType } from '@nestjs/graphql';

export enum StoryTaskSubmitStatus {
  Pending = 'pending',
  Rejected = 'rejected',
  Approved = 'approved',
}

registerEnumType(StoryTaskSubmitStatus, {
  name: 'StoryTaskSubmitStatus',
});
