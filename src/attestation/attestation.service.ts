import { Injectable, BadRequestException, UseGuards } from '@nestjs/common';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { toBigInt } from 'ethers';
import { Utils } from 'alchemy-sdk';
import { PrivyService } from '../privy/privy.service';
import * as communityData from '../data/communityData.json';
import { ConfigService } from '@nestjs/config';
import { PrivyGuard } from 'src/privy/privy.guard';
import { EAS_CONFIG } from 'src/config/siteConfig';

// Add export keyword to make the interface available
export interface StampAttestationRequest {
  wallet: string;
  stamps: {
    [key: string]: string;  // stampId: attestationUID mapping
  };
}

@Injectable()
export class AttestationService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;

  constructor(
    private readonly privyService: PrivyService,
    private readonly configService: ConfigService
  ) {
    const PRIVATE_KEY = this.configService.get<string>('PRIVATE_KEY')!;
    const ALCHEMY_URL = this.configService.get<string>('ALCHEMY_URL')!;

    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    this.signer = new ethers.Wallet(PRIVATE_KEY, this.provider);
  }

  @UseGuards(PrivyGuard)
  async createAttestation(authorization: string, data: { platform: string; recipient: string; attester: string; signature: string; category:string; subcategory:string; }) {
    const { platform, recipient, attester, signature, category, subcategory } = data;

    // Check if attester and recipient are the same
    if (attester.toLowerCase() === recipient.toLowerCase()) {
      throw new BadRequestException("Error: You cannot vouch for yourself.");
    }

    const communityKey = `${category}/${subcategory}/${platform}`;
    const communityInfo = Object.values(communityData).find(
      info => `${info.category}/${info.subcategory}/${info.platform}` === communityKey
    );

    if (!communityInfo) {
      throw new BadRequestException('Invalid community information');
    }

    const easContractAddress = communityInfo.verifyingContract;
    const schemaUID = communityInfo.schema;

    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);

    const schemaEncoder = new SchemaEncoder("bytes32 platform,bytes32 category,bytes32 subCategory");
    const encodedData = schemaEncoder.encodeData([
      { name: "platform", value: ethers.encodeBytes32String(platform), type: "bytes32" },
      { name: "category", value: ethers.encodeBytes32String(category), type: "bytes32" },
      { name: "subCategory", value: ethers.encodeBytes32String(subcategory), type: "bytes32" }
    ]);

    const expandedSig = Utils.splitSignature(signature);

    const transaction = await eas.attestByDelegation({
      schema: schemaUID,
      data: {
        recipient: recipient,
        expirationTime: toBigInt(0),
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: encodedData
      },
      signature: expandedSig,
      attester: attester,
      deadline: toBigInt(0)
    });

    const newAttestationUID = await transaction.wait();
    console.log('New attestation UID:', newAttestationUID);

    return newAttestationUID;
  }

  @UseGuards(PrivyGuard)
  async revokeAttestation(authorization: string, data: { signature: string; uid: string, address: string }) {
    const { signature, uid, address } = data;

    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const schemaUID = EAS_CONFIG.VOUCH_SCHEMA;

    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);

    const expandedSig = Utils.splitSignature(signature);

    const transaction = await eas.revokeByDelegation({
      schema: schemaUID,
      data: {
        uid: uid,
      },
      signature: expandedSig,
      revoker: address,
      deadline: toBigInt(0)
    });

    const newAttestationRevoke = await transaction.wait();

    return newAttestationRevoke;
  }

  async getEasNonce(attester: string): Promise<string> {
    if (!attester) {
      throw new BadRequestException('Attester is required');
    }

    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);
    const easNonce = await eas.getNonce(attester);

    return easNonce.toString();
  }

  async handleStampAttestation(data: StampAttestationRequest): Promise<any> {
    console.log('[handleStampAttestation] Starting with data:', JSON.stringify(data, null, 2));
    
    const { wallet, stamps } = data;
    
    if (!wallet || !stamps || Object.keys(stamps).length === 0) {
      console.log('[handleStampAttestation] Validation failed:', { wallet, stampsLength: Object.keys(stamps || {}).length });
      throw new BadRequestException('Wallet and at least one stamp attestation are required');
    }

    const results = {
      successful: [] as string[],
      failed: [] as { stampId: string; error: string }[]
    };

    // Process each stamp attestation
    for (const [stampId, attestationUID] of Object.entries(stamps)) {
      console.log(`[handleStampAttestation] Processing stamp ${stampId} with attestation ${attestationUID}`);
      try {
        const result = await this.handleSafeAttestation({
          wallet,
          attestationUID,
          stampId
        });
        
        console.log(`[handleStampAttestation] Result for stamp ${stampId}:`, result);
        
        if (result.status === 'ALREADY_REGISTERED') {
          results.failed.push({ 
            stampId, 
            error: 'Already registered' 
          });
        } else {
          results.successful.push(stampId);
        }
      } catch (error) {
        console.error(`[handleStampAttestation] Error processing stamp ${stampId}:`, error);
        results.failed.push({ 
          stampId, 
          error: error.message || 'Unknown error occurred' 
        });
      }
    }

    const finalResult = {
      wallet,
      results: {
        successful: results.successful,
        failed: results.failed,
        totalProcessed: Object.keys(stamps).length,
        successCount: results.successful.length,
        failureCount: results.failed.length
      }
    };

    console.log('[handleStampAttestation] Final result:', JSON.stringify(finalResult, null, 2));
    return finalResult;
  }

  async handleSafeAttestation(data: { 
    wallet: string, 
    attestationUID: string,
    stampId: string 
  }): Promise<any> {
    console.log('[handleSafeAttestation] Starting with data:', JSON.stringify(data, null, 2));
    
    const { wallet, attestationUID, stampId } = data;

    const stampsHistory = [
      { id: '1', title: 'Music Prophet', description: 'You voted for three songs that ended up in the top 10. You\'ve got the magic touch!', icon: '/StampIt.png', isLocked: true },
      { id: '2', title: 'Passionate Proposer', description: 'You\'ve proposed 10+ songs that have entered the top 100. You bring the hits!', icon: '/StampIt.png', isLocked: true },
      { id: '3', title: 'Midnight DJ', description: 'You proposed or voted on songs during the "dead hours" and kept the playlist alive.', icon: '/StampIt.png', isLocked: true },
      { id: '4', title: 'Lone Listener', description: 'You voted for a song that no one else dared to. We see you.', icon: '/StampIt.png', isLocked: true },
      { id: '5', title: 'Party Catalyst', description: 'Your song was the first to reach 10 votes.', icon: '/StampIt.png', isLocked: true },
      { id: '6', title: 'Genre Guru', description: 'You\'ve voted for 10+ songs of the same genre. You\'re kind of an expert, aren\'t you?', icon: '/StampIt.png', isLocked: true },
      { id: '7', title: 'Love at First Sight', description: 'You proposed a song.', icon: '/StampIt.png', isLocked: true },
      { id: '8', title: 'Diamond Curator', description: 'A song you voted ended up in the top 10.', icon: '/StampIt.png', isLocked: true },
      { id: '9', title: 'Gold Curator', description: 'A song you voted ended up in the top 50.', icon: '/StampIt.png', isLocked: true },
      { id: '10', title: 'Silver Curator', description: 'A song you voted ended up in the top 100.', icon: '/StampIt.png', isLocked: true },
      { id: '11', title: 'Diverse Taste', description: 'You liked several genres while proposing.', icon: '/StampIt.png', isLocked: true },
      { id: '12', title: 'All In', description: 'You used ALL your vouches.', icon: '/StampIt.png', isLocked: true },
    ];

    // Find the stamp details from stampsHistory
    const stampDetails = stampsHistory.find(stamp => stamp.id === stampId);
    console.log('[handleSafeAttestation] Found stamp details:', stampDetails);
    
    if (!stampDetails) {
      console.error('[handleSafeAttestation] Invalid stamp ID:', stampId);
      throw new BadRequestException(`Invalid stamp ID: ${stampId}`);
    }

    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const schemaUID = "0xce5523e4dc2ef468d860e836399b6e374d998de3c33c9f1c4063999d8e2fed5a";
    const eas = new EAS(easContractAddress);

    const PRIVATE_KEY = process.env.PRIVATE_KEY!;
    const ALCHEMY_URL = process.env.ALCHEMY_URL!;

    const provider = new JsonRpcProvider(ALCHEMY_URL);
    const signer = new Wallet(PRIVATE_KEY, provider);

    // Connect the EAS instance to the signer
    eas.connect(signer);

    
    // TODO: Add the schema for the attestation
    const schemaEncoder = new SchemaEncoder(
      'bytes32 stampId, string name, string description, string imageUrl'
    );

    // TODO: Add the values for nullifier, category, subcategory, issuer, credentialType and platform
    const encodedData = schemaEncoder.encodeData([
      { name: 'stampId', value: ethers.encodeBytes32String(stampId), type: 'bytes32' },
      { name: 'name', value: stampDetails.title, type: 'string' },
      { name: 'description', value: stampDetails.description, type: 'string' },
      { name: 'imageUrl', value: stampDetails.icon, type: 'string' },
    ]);

    try {
      // Create the attestation
      const tx = await eas.attest({
        schema: schemaUID,
        data: {
          recipient: wallet,
          expirationTime: 0n,
          revocable: true,
          data: encodedData,
          refUID: attestationUID,
        },
      });

      console.log('[handleSafeAttestation] Transaction submitted:', tx);

      // Wait for the transaction to be mined and get the attestation UID
      const newAttestationUID = await tx.wait();
      console.log('[handleSafeAttestation] New attestation UID:', newAttestationUID);

      return { attestationUID: newAttestationUID };
    } catch (error) {
      console.error('[handleSafeAttestation] Error:', error);
      if (error.reason === 'Already registered') {
        return { status: 'ALREADY_REGISTERED', message: 'POD is already registered' };
      }
      throw error;
    }

  }

}


