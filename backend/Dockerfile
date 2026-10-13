# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests first for deterministic layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and typecheck/emit the production build.
# (Prisma CLI is intentionally kept here so the `migrate` stage can run migrations.)
RUN npx prisma generate \
 && npm run build

# ---- Stage 2: migrate (retains the Prisma CLI for reviewed migrations) ----
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- Stage 3: runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production

# Create a non-root user.
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app

# Copy production node_modules and built output.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma

# Drop dev dependencies (TypeScript, Vitest, etc.) from the final image.
RUN npm prune --omit=dev

USER app
EXPOSE 3000

# Health check uses the API's own liveness endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]