import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttestationModule } from './attestation/attestation.module';
import { PrivyModule } from './privy/privy.module';
import { PcdsModule } from './pcds/pcds.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    PrivyModule,
    AttestationModule,
    PcdsModule,    
  ],
})
export class AppModule {}