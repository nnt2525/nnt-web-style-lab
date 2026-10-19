FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
COPY scripts ./scripts
RUN node scripts/build.mjs && mkdir -p /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=4180 DB_PATH=/data/lab.sqlite
EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:4180/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
