import { Module } from '@nestjs/common';
import { ChainModule } from 'src/chain/chain.module';
import { CoreModule } from 'src/core/core.module';
import { IdentModule } from 'src/core/ident/ident.module';
import { LoginService } from './login.service';

@Module({
  imports: [CoreModule, ChainModule, IdentModule],
  providers: [LoginService],
  exports: [LoginService],
})
export class LoginModule {}
