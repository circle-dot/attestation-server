import { Test, TestingModule } from '@nestjs/testing';
import { AttestationController } from './attestation.controller';

describe('AttestationController', () => {
  let controller: AttestationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttestationController],
    }).compile();

    controller = module.get<AttestationController>(AttestationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
