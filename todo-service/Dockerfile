# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json if it exists
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle the rest of the application code
COPY . .

# Expose the port the app runs on (default 3000)
EXPOSE 3001

# Define environment variables if needed (e.g., JWT_SECRET, MONGO_URI, PORT)
# ENV MONGO_URI=your_mongodb_connection_string

# Run the User Service
CMD ["node", "index.js"]
