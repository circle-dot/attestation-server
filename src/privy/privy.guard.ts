import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrivyService } from './privy.service';

@Injectable()
export class PrivyGuard implements CanActivate {
  constructor(private readonly privyService: PrivyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    try {
      await this.privyService.getPrivyClient().verifyAuthToken(authorization);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new UnauthorizedException('Token verification failed');
    }
  }
}