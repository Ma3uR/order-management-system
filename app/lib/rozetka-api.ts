import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export class RozetkaAPI {
  private static instance: RozetkaAPI;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('RozetkaAPI can only be used on the server side');
    }
  }

  static getInstance(): RozetkaAPI {
    if (!RozetkaAPI.instance) {
      RozetkaAPI.instance = new RozetkaAPI();
    }
    return RozetkaAPI.instance;
  }

  async authenticate() {
    try {
      const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');

      const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
        username: process.env.ROZETKA_USERNAME,
        password: base64Password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data?.content?.access_token) {
        throw new Error('No access token in response');
      }

      this.token = response.data.content.access_token;
      // Set token expiry to slightly less than the actual expiry time
      this.tokenExpiry = new Date(Date.now() + (3600 * 1000 - 60000)); // 59 minutes
      return this.token;
    } catch (error) {
      console.error('Rozetka authentication failed:', error);
      throw error;
    }
  }

  public async ensureValidToken() {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.token;
  }
}
