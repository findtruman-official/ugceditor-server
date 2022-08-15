import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Jwt {
  @Field()
  token: string;

  @Field(() => Int)
  expiresIn: number;
}
