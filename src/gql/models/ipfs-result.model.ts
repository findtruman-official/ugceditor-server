import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class IpfsResult {
  @Field()
  cid: string;

  @Field()
  url: string;
}
