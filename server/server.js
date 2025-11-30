import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import contactRoutes from "./routes/contactRoutes.js";



// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use absolute path to .env file
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("PORT from env:", process.env.PORT);
console.log("Current working dir:", process.cwd());
console.log("MONGO_URI from env:", process.env.MONGO_URI ? "✅ Loaded" : "❌ Not Loaded");


// import dotenv from "dotenv";
// dotenv.config();

import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import cors from "cors";

const app = express();

// Move CORS middleware to the very top

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());

// Routes
app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/chats", chatRoutes);

const PORT = process.env.PORT || 5001;

// Start server only after DB is connected
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

