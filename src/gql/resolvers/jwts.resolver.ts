import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { LoginService } from 'src/login/login.service';
import { Jwt } from '../models/jwt.model';

@Resolver(() => Jwt)
export class JwtsResolver {
  constructor(private readonly loginSvc: LoginService) {}

  @Mutation(() => Jwt, {
    name: 'login',
  })
  async mutLogin(
    @Args('chain') chain: string,
    @Args('account') account: string,
    @Args('message') message: string,
    @Args('signature') signature: string,
    @Args('pubkey', { nullable: true }) pubkey?: string,
  ): Promise<Jwt> {
    return await this.loginSvc.login(
      chain,
      signature,
      account,
      message,
      pubkey,
    );
  }
}
