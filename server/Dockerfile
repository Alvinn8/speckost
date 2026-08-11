FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
