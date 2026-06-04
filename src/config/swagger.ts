import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const isCompiled = /[/\\]dist[/\\]/.test(configDir);
const modulesDir = path.resolve(configDir, '..', 'modules');
/** swagger-jsdoc globs need forward slashes (e.g. on Windows). */
const routeApiGlob = path.posix.join(
  modulesDir.replace(/\\/g, '/'),
  '**',
  isCompiled ? '*.routes.js' : '*.routes.ts',
);

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
        url: `${env.APP_URL}/api/v1`,
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
  apis: [routeApiGlob],
};

export const swaggerSpec = swaggerJsdoc(options);

/** Enabled in dev; on Render/staging set NODE_ENV=production and keep docs via ENABLE_SWAGGER=true if needed. */
export function isSwaggerEnabled(): boolean {
  return env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';
}
