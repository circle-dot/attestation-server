import { Module } from '@nestjs/common';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';
import { PrivyModule } from '../privy/privy.module';
import { PcdsModule } from '../pcds/pcds.module';

@Module({
  imports: [PrivyModule, PcdsModule],
  controllers: [PodController],
  providers: [PodService],
})
export class PodModule {}
