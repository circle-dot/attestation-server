import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttestationController } from './attestation.controller';
import { AttestationService } from './attestation.service';
import { PrivyModule } from '../privy/privy.module';

@Module({
  imports: [ConfigModule, PrivyModule],
  controllers: [AttestationController],
  providers: [AttestationService],
})
export class AttestationModule {}