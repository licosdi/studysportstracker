# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Create directory for persistent data (will be mounted as volume)
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/studytracker.db

# Run database migration and start server
CMD npm run migrate && npm start
