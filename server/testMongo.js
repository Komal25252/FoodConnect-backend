import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" }); // or "./.env" depending on your structure

console.log("Env loaded?", process.env.MONGO_URI ? "✅ Yes" : "❌ No");
console.log("Using URI:", process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Connection failed:", err.message));

