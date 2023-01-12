FROM node:18-alpine as build

WORKDIR /app

COPY . .

RUN npm i

RUN npm build

FROM node:18-alpine

COPY --from=build /app/build /app/
COPY --from=build /app/package.json /app/
COPY --from=build /app/package-lock.json /app/

RUN npm ci --production

RUN apk add ffmpeg --no-cache

ENTRYPOINT ["node", "/app/index.js"]
