FROM node:alpine as builder

ARG SIGNALER_HOST
ARG SIGNALER_PORT
ARG SIGNALER_URL
ARG STUN_HOST
ARG STUN_PORT

ENV SIGNALER_HOST=$SIGNALER_HOST
ENV SIGNALER_PORT=$SIGNALER_PORT

WORKDIR /app/web

COPY web /app/web
COPY shared /app/shared

RUN npm i && npm run build && mv ./dist /

# ==============================================================================

FROM nginx:alpine

RUN adduser -D -g 'www' www && mkdir -p /www /var/lib/nginx && \
    chown -R www:www /var/lib/nginx /var/log/nginx /www

# https://github.com/docker-library/docs/tree/master/nginx#using-environment-variables-in-nginx-configuration

COPY ./nginx.conf /etc/nginx/templates/nginx.conf.template
COPY --from=builder /dist /www

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
