import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  restaurant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Restaurant", 
    required: true 
  },
  restaurantUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  foodType: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: String, 
    required: true 
  },
  expiryTime: { 
    type: Date, 
    required: true 
  },
  pickupLocation: { 
    type: String, 
    required: true 
  },
  preferredOption: { 
    type: String, 
    enum: ["NGO Pickup", "Restaurant Delivery"], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["Available", "Requested", "Accepted", "Completed"], 
    default: "Available" 
  },
  requestedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "NGO", 
    default: null 
  },
  requestedByUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  },
  requestedAt: { 
    type: Date, 
    default: null 
  },
  acceptedAt: { 
    type: Date, 
    default: null 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  review: {
    type: String,
    default: null
  },
  ratedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model("Donation", donationSchema);