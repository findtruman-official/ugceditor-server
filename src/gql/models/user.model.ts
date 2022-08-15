import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field()
  chain: string;

  @Field()
  account: string;
}
