import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  phone: { type: String },
  description: { type: String },
  donations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Donation" 
  }]
}, { timestamps: true });

export default mongoose.model("Restaurant", restaurantSchema);