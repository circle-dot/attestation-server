import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';

@Injectable()
export class PrivyService {
  private readonly privy: PrivyClient;

  constructor(private configService: ConfigService) {
    const privyAppId = this.configService.get<string>('PRIVY_APP_ID');
    const privyAppSecret = this.configService.get<string>('PRIVY_APP_SECRET');

    if (!privyAppId || !privyAppSecret) {
      throw new Error('Privy environment variables are not set.');
    }

    this.privy = new PrivyClient(privyAppId, privyAppSecret);
  }

  getPrivyClient(): PrivyClient {
    return this.privy;
  }
}