import { RequestMethod, type INestApplication } from '@nestjs/common';

export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
}
