FROM node:24-alpine
WORKDIR /app
COPY . .
RUN apk add --no-cache curl \
    && mkdir -p /app/cache \
    && chown -R node:node /app \
    && npm install --production \
    && rm -rf /tmp/*
EXPOSE 5005
USER node
HEALTHCHECK --interval=60s --timeout=2s CMD curl -f http://localhost:5005/zones || exit 1
CMD ["npm", "start"]
