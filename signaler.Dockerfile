FROM node:alpine as builder

RUN addgroup -S builder && adduser -S -D -G 'builder' builder

WORKDIR /home/builder/server

COPY server /home/builder/server
COPY shared /home/builder/shared

RUN chown -Rf builder:builder ../server ../shared
USER builder

RUN npm ci && npx typescript && rm -rf src

FROM node:alpine

WORKDIR /app

COPY --from=builder /home/builder/server /app

CMD [ "npm", "start" ]
