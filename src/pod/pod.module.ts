import { Module } from '@nestjs/common';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';
import { PrivyModule } from '../privy/privy.module';

@Module({
  imports: [PrivyModule],
  controllers: [PodController],
  providers: [PodService],
})
export class PodModule {}
