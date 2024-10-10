import { Injectable } from '@nestjs/common';
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { Zupass, siteName } from 'src/config/siteConfig';
import { AuthTokenClaims } from '@privy-io/server-auth';
@Injectable()
export class PodService {
  private readonly ZUPASS_SIGNING_KEY = process.env.ZUPASS_SIGNING_KEY;

  async createOrRetrievePodpcd(authClaims: AuthTokenClaims): Promise<string> {
    if (!this.ZUPASS_SIGNING_KEY) {
      throw new Error('Server configuration error: Signing key not set');
    }
    try {
      console.log("authClaims:", authClaims);
      console.log("authClaims.userId", authClaims.userId);
      
      const pod = POD.sign(
        podEntriesFromSimplifiedJSON(JSON.stringify({
          zupass_display: Zupass.zupass_display,
          zupass_title: Zupass.zupass_title,
          zupass_image_url: Zupass.zupass_image_url,
          timestamp: new Date().toISOString(),
          issuer: siteName,
          owner: authClaims.userId,
          // wallet: wallet
        })),
        this.ZUPASS_SIGNING_KEY
      );
      return pod.serialize();
    } catch (error) {
      console.error('Error creating or retrieving POD:', error);
      throw new Error('Error creating or retrieving POD');
    }
  }

}