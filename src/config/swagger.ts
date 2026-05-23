import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RentWise API',
      version: '1.0.0',
      description: 'RentWise rental platform API — Team Neon, TechCrush Buildathon 2026',
    },
    servers: [
      {
        url: `${env.BETTER_AUTH_URL}/api/v1`,
        description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'validation error' },
            data: {
              type: 'object',
              properties: {
                fieldErrors: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function isSwaggerEnabled(): boolean {
  return env.NODE_ENV !== 'production';
}
