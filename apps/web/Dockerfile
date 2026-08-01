FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --ignore-scripts
COPY apps/web ./apps/web
RUN pnpm --filter @techseeker/web build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=base /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@techseeker/web", "start"]
