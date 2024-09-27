import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrivyService } from './privy.service';

@Injectable()
export class PrivyGuard implements CanActivate {
  constructor(private readonly privyService: PrivyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];
    const appId = request.headers['x-privy-app-id'];

    if (!authorization) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    if (!appId) {
      throw new UnauthorizedException('Privy app ID header is missing');
    }

    try {
      await this.privyService.getPrivyClient(appId).verifyAuthToken(authorization);
      return true;
    } catch (error) {
      console.error(`Token verification failed for app ${appId}:`, error);
      throw new UnauthorizedException('Token verification failed');
    }
  }
}