import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TaskModuleType {
  Basic = 'basic',
  Chain = 'chain',
}

registerEnumType(TaskModuleType, {
  name: 'TaskModuleType',
});

@ObjectType()
export class Chain {
  @Field({
    description: 'chain identifier',
  })
  type: string;

  @Field({
    description: 'chain readable name',
  })
  name: string;

  @Field({
    description: 'story factory address',
  })
  factoryAddress: string;

  @Field({
    description: 'finds token address (solana mint)',
  })
  findsAddress: string;

  @Field(() => TaskModuleType, {
    description: 'task module type.',
  })
  taskModule: TaskModuleType;
}
