# Builder Stage
FROM ubuntu:22.04 AS builder

# Install Node.js, pnpm, Python, and build tools
RUN apt-get update && \
    apt-get install -y curl python3 python3-pip python3-distutils build-essential gcc g++ make && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app/graph-vis

COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .

ENV NODE_ENV production
ENV NEXT_PUBLIC_QG_ROOT_NODE Algorithms
RUN pnpm build 

# Runtime Stage
FROM ubuntu:22.04 AS final

# Install Node.js, NGINX, Python, and authentication tools
RUN apt-get update && \
    apt-get install -y curl nginx apache2-utils python3 python3-pip python3-distutils build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app/graph-vis

# Copy necessary files from the build stage
COPY --from=builder /app/graph-vis/package.json /app/graph-vis/pnpm-lock.yaml ./
COPY --from=builder /app/graph-vis/.next ./.next
COPY --from=builder /app/graph-vis/node_modules ./node_modules
COPY --from=builder /app/graph-vis/next.config.ts ./
COPY --from=builder /app/graph-vis/public ./public

ENTRYPOINT [ "pnpm", "start" ]