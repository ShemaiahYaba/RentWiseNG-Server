# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY drizzle.config.ts ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./src/db/migrations

RUN pnpm install --frozen-lockfile --prod \
  && pnpm add drizzle-kit@0.30.6 tsx@4.22.3

EXPOSE 3000
CMD ["node", "dist/server.js"]
