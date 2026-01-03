# Stage 1: Build the application
FROM node:18-alpine AS builder

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
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy the built app from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the app runs on (assuming 3000, will ask for confirmation)
EXPOSE 3001

# Define the command to run the app
CMD [ "npm", "start" ]
