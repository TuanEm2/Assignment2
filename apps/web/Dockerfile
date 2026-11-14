FROM node:26-bookworm-slim
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_MOCK_PAYMENT_TEST_CONTROLS=false
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MOCK_PAYMENT_TEST_CONTROLS=${NEXT_PUBLIC_MOCK_PAYMENT_TEST_CONTROLS}
RUN npm run build:web

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start", "-w", "apps/web"]
