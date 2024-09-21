import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttestationModule } from './attestation/attestation.module';
import { PrivyModule } from './privy/privy.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    PrivyModule,
    AttestationModule,
  ],
})
export class AppModule {}