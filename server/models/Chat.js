import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderRole: {
    type: String,
    enum: ["restaurant", "ngo"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true
  },
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "NGO",
    required: true
  },
  restaurantUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  ngoUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  lastReadByRestaurant: {
    type: Date,
    default: null
  },
  lastReadByNGO: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Ensure only one chat per restaurant-NGO pair
chatSchema.index({ restaurant: 1, ngo: 1 }, { unique: true });

export default mongoose.model("Chat", chatSchema);