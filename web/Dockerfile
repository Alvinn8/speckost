FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN corepack install
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN pnpm build

FROM nginx:alpine

ARG VITE_BASE_PATH=/
ENV BASE_PATH=$VITE_BASE_PATH

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
