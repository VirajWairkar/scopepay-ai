FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json README.md LICENSE ./
RUN npm install --omit=dev
COPY client ./client
COPY server ./server
COPY scripts ./scripts
ENV PORT=3000 HOST=0.0.0.0 PAYPAL_ENV=sandbox
EXPOSE 3000
CMD ["node", "server/index.mjs"]
