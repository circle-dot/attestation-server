import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { isEqualEdDSAPublicKey } from '@pcd/eddsa-pcd';
import { ethers } from 'ethers';
import { EAS_CONFIG } from 'src/config/siteConfig';
import { HandleAttestService } from './handleAttest.service';
import { TicketTypeName } from 'src/config/zupass/types';
import { whitelistedTickets,matchTicketToType } from 'src/config/zupass/zupass-config';
@Injectable()
export class PcdsService {
  constructor(private readonly handleAttestService: HandleAttestService) {}

  async validatePCD(body: { pcds: any; user: any, signature: string }) {
    const { pcds: inputPCD, user, signature } = body;
    let response: { error?: string; status: number; nullifier?: string; attestationUID?: string } = { status: 200 };

    try {
      console.log("Attempting to deserialize PCD:", inputPCD);
      const pcd = inputPCD;
      console.log("PCD:", pcd);
      const eventId = inputPCD.claim.partialTicket.eventId;
      const productId = inputPCD.claim.partialTicket.productId;

      console.log(`Matching ticket type for eventId: ${eventId}, productId: ${productId}`);
      if (!eventId || !productId) {
        console.log('EventId or ProductId is undefined');
        throw new Error("EventId or ProductId is undefined");
      }
      const ticketType = matchTicketToType(eventId, productId);
      if (!ticketType) {
        console.log('Failed to match ticket type');
        throw new Error("Unable to determine ticket type.");
      }
      console.log(`Matched ticket type: ${ticketType}`);

      const eventName = whitelistedTickets[ticketType].find(
        ticket => ticket.eventId === eventId && ticket.productId === productId
      )?.eventName;

      if (!eventName) {
        console.log('Failed to find event name');
        throw new Error("Unable to determine event name.");
      }

      if (!pcd.claim.nullifierHash) {
        response = {
          error: "PCD ticket nullifier has not been defined",
          status: 401
        };
      } else {
        let isValid = false;

        console.log('Verifying Zupass signature...');
        console.log('PCD signer:', JSON.stringify(pcd.claim.signer));

        for (const type of Object.keys(whitelistedTickets) as TicketTypeName[]) {
          const tickets = whitelistedTickets[type];

          if (tickets) {
            for (const ticket of tickets) {
              const publicKey = ticket.publicKey;
              console.log('Checking against public key:', JSON.stringify(publicKey));

              if (isEqualEdDSAPublicKey(publicKey, pcd.claim.signer)) {
                isValid = true;
                console.log('Found matching public key');
                break;
              }
            }
          }

          if (isValid) break;
        }

        if (!isValid) {
          console.error(`[ERROR] PCD is not signed by Zupass`);
          response = { error: "PCD is not signed by Zupass", status: 401 };
        } else {
          response.nullifier = pcd.claim.nullifierHash;

          try {
            const recipient = user.wallet.address;
            const nullifier = ethers.hexlify(
              ethers.keccak256(
                ethers.concat([
                  ethers.toUtf8Bytes(pcd.claim.partialTicket.attendeeSemaphoreId),
                  ethers.keccak256(ethers.toUtf8Bytes(productId))
                ])
              ).slice(0, 66)
            );
            const category = EAS_CONFIG.CATEGORY;
            const subcategory = ticketType;
            const issuer = EAS_CONFIG.ISSUER;
            const credentialType = EAS_CONFIG.CREDENTIAL_TYPE;
            const platform = EAS_CONFIG.PLATFORM;

            const attestationUID = await this.handleAttestService.handleAttest(
              recipient,
              nullifier,
              category,
              subcategory,
              issuer,
              credentialType,
              platform,
              user.wallet.address,
              signature
            );

            response.attestationUID = attestationUID;
            console.log("Attestation created successfully:", attestationUID);
          } catch (attestError) {
            console.error("Error creating attestation:", attestError);
            response = { error: "Error creating attestation", status: 500 };
          }
        }
      }
    } catch (error) {
      console.error('Error processing PCD:', error);
      response = { error: "Error processing PCD", status: 500 };
    }

    console.log("Response:", response);
    return response;
  }
}