# Use Node.js 20 slim as base image
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 7575

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7575

# Start the application using the scuttle script
CMD ["npm", "run", "scuttle:prod-start"]
