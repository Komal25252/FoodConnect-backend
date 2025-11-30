import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  password: { type: String, required: true },
  role: { type: String, enum: ["ngo", "restaurant"], required: true },
  avatar: { type: String },
  location: {
    type: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String }
    },
    required: false,
    default: null
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
