import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttestationModule } from './attestation/attestation.module';
import { PrivyModule } from './privy/privy.module';
import { PcdsModule } from './pcds/pcds.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';
@Module({
  imports: [
    ConfigModule.forRoot(),
    PrivyModule,
    AttestationModule,
    PcdsModule,    
  ],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}