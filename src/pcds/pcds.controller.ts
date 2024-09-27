import { Controller, Post, Body, Headers, InternalServerErrorException, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { PcdsService } from './pcds.service';
import { PrivyGuard } from 'src/privy/privy.guard';

@Controller('pcds')
export class PcdsController {
  constructor(private readonly pcdsService: PcdsService) {}

  @Post()
  @UseGuards(PrivyGuard)
  async handlePost(
    @Body() body: { pcds: any; user: any },
    @Headers('x-privy-app-id') appId: string
  ) {
    try {
      const response = await this.pcdsService.validatePCDs(body);
      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        console.error('Error processing PCD:', error);
        throw new InternalServerErrorException('Error processing PCD');
      }
    }
  }
}
