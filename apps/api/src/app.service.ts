import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: 'brewlite-api';
  timestamp: string;
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  /** Liveness endpoint. No DB call: 200 means the API process can respond. */
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'brewlite-api',
      timestamp: new Date().toISOString(),
    };
  }
}
