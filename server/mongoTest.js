import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try multiple possible .env locations
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env')
];

let envLoaded = false;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env at: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error("❌ No .env file found in any of the checked locations");
}

console.log("MONGO_URI loaded?", process.env.MONGO_URI ? "✅ Yes" : "❌ No");

if (process.env.MONGO_URI) {
  console.log("Attempting to connect to MongoDB...");
  
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ Successfully connected to MongoDB");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err);
      process.exit(1);
    });
} else {
  console.error("❌ MONGO_URI is not defined in environment variables");
  process.exit(1);
}