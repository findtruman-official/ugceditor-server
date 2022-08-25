import { Injectable, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

type Payload = {
  chain: string;
  account: string;
};

@Injectable()
export class IdentService {
  private logger = new Logger(IdentService.name);

  constructor(private readonly jwtService: JwtService) {}

  async generateToken(
    payload: Payload,
    opts?: JwtSignOptions,
  ): Promise<string> {
    const token = await this.jwtService.signAsync(payload, opts);
    return token;
  }

  async decodeToken(token: string): Promise<Payload> {
    const payload = await this.jwtService.verifyAsync<Payload>(token);
    return payload;
  }
}
