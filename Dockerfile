# Stage 1: Build the application
FROM node:18-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Stage 2: Create the final image
FROM node:18-slim

# Install dependencies needed for curl and agy
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google Antigravity CLI (agy)
RUN curl -fsSL https://antigravity.google/cli/install.sh | bash

# Add agy binary directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /usr/src/app

# Copy the built app from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the app
CMD [ "node", "dist/bar-assistant-mcp-server.js" ]
