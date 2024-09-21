import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrivyService } from './privy.service';

@Module({
  imports: [ConfigModule],
  providers: [PrivyService],
  exports: [PrivyService],
})
export class PrivyModule {}