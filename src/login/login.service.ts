import { Injectable } from '@nestjs/common';
import { ChainService } from 'src/chain/chain.service';
import { IdentService } from 'src/core/ident/ident.service';

@Injectable()
export class LoginService {
  // Verify Sign & Give Token
  constructor(
    private readonly chainService: ChainService,
    private readonly identService: IdentService,
  ) {}

  async login(
    chain: string,
    signature: string,
    account: string,
    message: string,
    pubkey?: string,
  ): Promise<{
    token: string;
    expiresIn: number;
  }> {
    if (!this._isValidLoginMessage(message)) {
      throw new Error('invalid message');
    }
    if (pubkey) {
      if (
        !(await this.chainService.isPkAccountMatched(chain, pubkey, account))
      ) {
        throw new Error('account and pubkey is not matched.');
      }
    }
    const isValid = await this.chainService.isValidSignature(
      chain,
      signature,
      pubkey || account,
      message,
    );
    const expiresIn = 60 * 60 * 24 * 7; // 7days
    if (isValid) {
      const token = await this.identService.generateToken(
        {
          chain: chain,
          account: account,
        },
        { expiresIn },
      );
      return {
        expiresIn,
        token,
      };
    } else {
      // TODO THROW ERR CODE
      throw new Error('signature error');
    }
  }

  /**
   * message should be (time expires in 30 seconds):
   *
   * sign this message to login FindTruman Co-creation Story Platform.
   * current time: 1660094990
   */
  private _isValidLoginMessage(message: string) {
    const tmpl =
      /^sign this message to login FindTruman Co-creation Story Platform.\ncurrent time: (\d+)$/;
    const result = message.match(tmpl);
    if (result) {
      const timestamp = parseInt(result[1]);
      const currTimestamp = new Date().valueOf() / 1000;
      if (currTimestamp > timestamp && currTimestamp - timestamp <= 30) {
        return true;
      }
    }
    return false;
  }
}
