import { Query, Resolver } from '@nestjs/graphql';
import { Ident } from 'src/core/decorators/ident.decorator';
import { User } from '../models/user.model';

@Resolver(() => User)
export class UsersResolver {
  @Query(() => User, {
    name: 'currentUser',
    nullable: true,
    description: 'return user info if x-token is valid.',
  })
  async queryCurrentUser(@Ident() ident): Promise<User> {
    return ident;
  }
}
