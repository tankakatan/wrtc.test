FROM node:alpine as builder

WORKDIR /app

COPY ./server /app

RUN npx typescript && rm -rf src

FROM node:alpine

WORKDIR /app

COPY --from=builder /app /app

RUN ls -ahl && ls -ahl build && npm ci

CMD [ "npm", "start" ]
