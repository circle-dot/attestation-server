import { Injectable } from '@nestjs/common';
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { Zupass, siteName } from 'src/config/siteConfig';
// import { AuthTokenClaims } from '@privy-io/server-auth';
import {
  boundConfigToJSON,
  gpcVerify,
  revealedClaimsToJSON
} from "@pcd/gpc";
import * as path from 'path';
import { HandleAttestService } from '../pcds/handleAttest.service';
import { ethers } from 'ethers';
@Injectable()
export class PodService {
  constructor(private readonly handleAttestService: HandleAttestService) {}

  private readonly ZUPASS_SIGNING_KEY = process.env.ZUPASS_SIGNING_KEY;

  async createOrRetrievePodpcd( wallet: string, AgoraScore: string): Promise<string> {
    if (!this.ZUPASS_SIGNING_KEY) {
      throw new Error('Server configuration error: Signing key not set');
    }
    try {
      const pod = POD.sign(
        podEntriesFromSimplifiedJSON(JSON.stringify({
          zupass_display: Zupass.zupass_display,
          zupass_title: Zupass.zupass_title,
          zupass_image_url: Zupass.zupass_image_url,
          timestamp: new Date().toISOString(),
          issuer: siteName,
          wallet: wallet,
          AgoraScore: AgoraScore
         })),
        this.ZUPASS_SIGNING_KEY
       );
      return pod.serialize();
    } catch (error) {
      console.error('Error creating or retrieving POD:', error);
      throw new Error('Error creating or retrieving POD');
    }
  }

  async verifyProof(proofData: any): Promise<{ attestationUID: string; nullifier: string } | { nullifier: string; status: string; message: string }> {
    const { proof, boundConfig, revealedClaims, commitment, wallet } = proofData;
    // Extract the required values
    const circuitIdentifier = boundConfig.circuitIdentifier;
    const signerPublicKey = revealedClaims.pods.ticket.signerPublicKey;
    const eventId = revealedClaims.pods.ticket.entries.eventId.value;
    const GPC_ARTIFACTS_PATH = path.resolve(
      process.cwd(),
      "node_modules/@pcd/proto-pod-gpc-artifacts"
    );


    const isValid = await gpcVerify(
      proof,
      boundConfig,
      revealedClaims,
      GPC_ARTIFACTS_PATH
    );
    console.log("isValid", isValid);
    if (!isValid) {
      throw new Error("Proof didn't verify!");
    }

    // Verifiers should also always check that the PODs are signed by a trusted
    // authority with a known public key.
    const knownPublicKey = 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs'
    if (revealedClaims.pods.ticket.signerPublicKey !== knownPublicKey) {
      throw new Error("Unexpected signer.");
    }

    try {
      const nullifierHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes(commitment),
          ethers.toUtf8Bytes(eventId)
        ])
      ).slice(0, 66);
      // This values are for devcon only.
      const result = await this.handleAttestService.handleAttest(
        wallet,
        nullifierHash,
        'SocialStereo',
        'Music',
        "Stamp",
        'Ticket',
        'Devcon'
      );
      
      if ('status' in result) {
        return {
          nullifier: nullifierHash,
          status: result.status,
          message: result.message
        };
      }

      console.log('Attestation created successfully:', result.attestationUID);
      return {
        attestationUID: result.attestationUID,
        nullifier: nullifierHash
      };
    } catch (error) {
      console.error('Error creating attestation:', error);
      throw new Error('Failed to create attestation');
    }
  }


  async createPod(entries: Record<string, any> = {}): Promise<string> {
    if (!this.ZUPASS_SIGNING_KEY) {
      throw new Error('Server configuration error: Signing key not set');
    }
    
    try {
      const pod = POD.sign(
        podEntriesFromSimplifiedJSON(JSON.stringify(entries)),
        this.ZUPASS_SIGNING_KEY
      );
      return pod.serialize();
    } catch (error) {
      console.error('Error creating POD:', error);
      throw new Error('Error creating POD');
    }
  }
}