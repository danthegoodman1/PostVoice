FROM node:18-alpine as build

WORKDIR /app

COPY . .

RUN npm ci --production

RUN npm build

FROM node:18-alpine

COPY --from=build /app/build /app/
COPY --from=build /app/node_modules /app/

RUN apk add ffmpeg --no-cache

ENTRYPOINT ["node", "/app/index.js"]
