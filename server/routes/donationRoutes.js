import express from "express";
import Donation from "../models/Donation.js";
import Restaurant from "../models/Restaurant.js";
import NGO from "../models/NGO.js";
import Chat from "../models/Chat.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Middleware to verify restaurant role
const verifyRestaurant = (req, res, next) => {
  if (req.user.role !== "restaurant") {
    return res.status(403).json({ message: "Access denied - Restaurant role required" });
  }
  next();
};

// Middleware to verify NGO role
const verifyNGO = (req, res, next) => {
  if (req.user.role !== "ngo") {
    return res.status(403).json({ message: "Access denied - NGO role required" });
  }
  next();
};

// Create a new donation (Restaurant)
router.post("/create", protect, verifyRestaurant, async (req, res) => {
  try {
    const { foodType, quantity, expiryTime, pickupLocation, preferredOption } = req.body;
    
    // Find or create the restaurant record for this user
    let restaurant = await Restaurant.findOne({ userId: req.user.id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        donations: []
      });
    }
    
    const donation = await Donation.create({
      restaurant: restaurant._id,
      restaurantUser: req.user.id,
      foodType,
      quantity,
      expiryTime,
      pickupLocation,
      preferredOption,
      status: "Available"
    });
    
    // Add donation to restaurant's donations array
    restaurant.donations.push(donation._id);
    await restaurant.save();
    
    res.status(201).json({ success: true, donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all available donations (NGO)
router.get("/available", protect, verifyNGO, async (req, res) => {
  try {
    const currentTime = new Date();
    
    // First, update expired donations to "Expired" status
    await Donation.updateMany(
      { 
        status: "Available",
        expiryTime: { $lt: currentTime }
      },
      { 
        status: "Expired" 
      }
    );
    
    // Then fetch only available and non-expired donations
    const donations = await Donation.find({ 
      status: "Available",
      expiryTime: { $gt: currentTime }
    })
      .populate("restaurant", "name email address phone location")
      .sort({ expiryTime: 1 }); // Sort by expiry time, soonest first
    
    res.status(200).json({ success: true, donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Request a donation (NGO)
router.post("/request/:id", protect, verifyNGO, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    
    if (donation.status !== "Available") {
      return res.status(400).json({ message: "Donation is not available" });
    }
    
    // Find or create the NGO record for this user
    let ngo = await NGO.findOne({ userId: req.user.id });
    if (!ngo) {
      ngo = await NGO.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        requests: []
      });
    }
    
    donation.status = "Requested";
    donation.requestedBy = ngo._id;
    donation.requestedByUser = req.user.id;
    donation.requestedAt = new Date();
    
    await donation.save();
    
    // Add request to NGO's requests array
    ngo.requests.push(donation._id);
    await ngo.save();
    
    // Find or create a chat between this restaurant and NGO
    let chat = await Chat.findOne({ 
      restaurant: donation.restaurant,
      ngo: ngo._id
    });
    
    if (!chat) {
      chat = await Chat.create({
        restaurant: donation.restaurant,
        ngo: ngo._id,
        restaurantUser: donation.restaurantUser,
        ngoUser: req.user.id,
        messages: [],
        lastMessage: new Date()
      });
      console.log("Chat created between restaurant and NGO");
    } else {
      console.log("Using existing chat between restaurant and NGO");
    }
    
    res.status(200).json({ success: true, donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get donation requests (Restaurant)
router.get("/requests", protect, verifyRestaurant, async (req, res) => {
  try {
    let restaurant = await Restaurant.findOne({ userId: req.user.id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        donations: []
      });
    }
    
    const currentTime = new Date();
    
    // Update expired donations
    await Donation.updateMany(
      { 
        restaurant: restaurant._id,
        status: { $in: ["Available", "Requested"] },
        expiryTime: { $lt: currentTime }
      },
      { 
        status: "Expired" 
      }
    );
    
    // Get only non-expired requested donations
    const donations = await Donation.find({ 
      restaurant: restaurant._id,
      status: "Requested",
      expiryTime: { $gt: currentTime }
    }).populate("requestedBy", "name email address phone location");
    
    res.status(200).json({ success: true, donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept donation request (Restaurant)
router.post("/accept/:id", protect, verifyRestaurant, async (req, res) => {
  try {
    let restaurant = await Restaurant.findOne({ userId: req.user.id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        donations: []
      });
    }
    
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    
    if (donation.status !== "Requested") {
      return res.status(400).json({ message: "Donation is not requested" });
    }
    
    if (donation.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    donation.status = "Accepted";
    donation.acceptedAt = new Date();
    
    await donation.save();
    
    res.status(200).json({ success: true, donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reject donation request (Restaurant)
router.post("/reject/:id", protect, verifyRestaurant, async (req, res) => {
  try {
    let restaurant = await Restaurant.findOne({ userId: req.user.id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        donations: []
      });
    }
    
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    
    if (donation.status !== "Requested") {
      return res.status(400).json({ message: "Donation is not requested" });
    }
    
    if (donation.restaurant.toString() !== restaurant._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Remove from NGO's requests array
    if (donation.requestedBy) {
      await NGO.findByIdAndUpdate(donation.requestedBy, {
        $pull: { requests: donation._id }
      });
    }
    
    donation.status = "Available";
    donation.requestedBy = null;
    donation.requestedByUser = null;
    donation.requestedAt = null;
    
    await donation.save();
    
    res.status(200).json({ success: true, donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get NGO's requests (NGO)
router.get("/my-requests", protect, verifyNGO, async (req, res) => {
  try {
    let ngo = await NGO.findOne({ userId: req.user.id });
    if (!ngo) {
      ngo = await NGO.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        requests: []
      });
    }
    
    const currentTime = new Date();
    
    // Update expired donations
    await Donation.updateMany(
      { 
        requestedBy: ngo._id,
        status: { $in: ["Requested", "Accepted"] },
        expiryTime: { $lt: currentTime }
      },
      { 
        status: "Expired" 
      }
    );
    
    // Get only non-expired donations
    const donations = await Donation.find({ 
      requestedBy: ngo._id,
      expiryTime: { $gt: currentTime }
    }).populate("restaurant", "name email address phone location");
    
    res.status(200).json({ success: true, donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Migration route to create missing Restaurant/NGO records
router.post("/migrate-user", protect, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role === "restaurant") {
      const existingRestaurant = await Restaurant.findOne({ userId: user.id });
      if (!existingRestaurant) {
        await Restaurant.create({
          userId: user.id,
          name: user.name,
          email: user.email,
          donations: []
        });
        return res.json({ success: true, message: "Restaurant profile created" });
      }
      return res.json({ success: true, message: "Restaurant profile already exists" });
    } else if (user.role === "ngo") {
      const existingNGO = await NGO.findOne({ userId: user.id });
      if (!existingNGO) {
        await NGO.create({
          userId: user.id,
          name: user.name,
          email: user.email,
          requests: []
        });
        return res.json({ success: true, message: "NGO profile created" });
      }
      return res.json({ success: true, message: "NGO profile already exists" });
    }
    
    res.status(400).json({ message: "Invalid user role" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Rate a donation (NGO only)
router.post("/:id/rate", protect, verifyNGO, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    
    // Verify the NGO is the one who requested this donation
    const ngo = await NGO.findOne({ userId: req.user.id });
    if (!ngo || donation.requestedBy.toString() !== ngo._id.toString()) {
      return res.status(401).json({ message: "Unauthorized - You can only rate donations you requested" });
    }
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    
    // Update donation with rating and review
    donation.rating = rating;
    donation.review = review || "";
    donation.ratedAt = new Date();
    
    await donation.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Rating submitted successfully",
      donation 
    });
  } catch (error) {
    console.error("Error rating donation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all reviews for a restaurant
router.get("/restaurant/:restaurantId/reviews", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Find all completed donations for this restaurant that have ratings
    const donations = await Donation.find({
      restaurant: restaurantId,
      status: "Completed",
      rating: { $exists: true, $ne: null }
    })
    .sort({ ratedAt: -1 });
    
    // Format the reviews (without NGO names for privacy)
    const reviews = donations.map(donation => ({
      rating: donation.rating,
      review: donation.review,
      ratedAt: donation.ratedAt,
      foodType: donation.foodType,
      quantity: donation.quantity
    }));
    
    // Calculate statistics
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    
    const stats = {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
    };
    
    res.status(200).json({
      success: true,
      reviews,
      stats
    });
  } catch (error) {
    console.error("Error fetching restaurant reviews:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark donation as completed (Restaurant or NGO)
router.post("/complete/:id", protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }
    
    if (donation.status !== "Accepted") {
      return res.status(400).json({ message: "Donation is not accepted" });
    }
    
    let isAuthorized = false;
    
    // Check if user is authorized (either the restaurant or the NGO)
    if (req.user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({ userId: req.user.id });
      if (restaurant && donation.restaurant.toString() === restaurant._id.toString()) {
        isAuthorized = true;
      }
    } else if (req.user.role === "ngo") {
      const ngo = await NGO.findOne({ userId: req.user.id });
      if (ngo && donation.requestedBy.toString() === ngo._id.toString()) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    donation.status = "Completed";
    donation.completedAt = new Date();
    
    await donation.save();
    
    res.status(200).json({ success: true, donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get donation history for Restaurant
router.get("/history/restaurant", protect, verifyRestaurant, async (req, res) => {
  try {
    let restaurant = await Restaurant.findOne({ userId: req.user.id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        donations: []
      });
    }

    // Get all donations by this restaurant
    const donations = await Donation.find({ 
      restaurant: restaurant._id 
    })
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 }); // Most recent first

    // Calculate statistics
    const stats = {
      totalDonations: donations.length,
      completedDonations: donations.filter(d => d.status === "Completed").length,
      pendingDonations: donations.filter(d => d.status === "Requested").length,
      availableDonations: donations.filter(d => d.status === "Available").length,
      expiredDonations: donations.filter(d => d.status === "Expired").length,
      totalQuantityDonated: donations
        .filter(d => d.status === "Completed")
        .reduce((total, d) => {
          // Extract number from quantity string (e.g., "5kg" -> 5, "10 plates" -> 10)
          const match = d.quantity.match(/\d+/);
          return total + (match ? parseInt(match[0]) : 0);
        }, 0)
    };

    res.status(200).json({ 
      success: true, 
      donations, 
      stats,
      restaurant: {
        name: restaurant.name,
        email: restaurant.email,
        totalDonations: stats.totalDonations,
        completedDonations: stats.completedDonations
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get donation history for NGO
router.get("/history/ngo", protect, verifyNGO, async (req, res) => {
  try {
    let ngo = await NGO.findOne({ userId: req.user.id });
    if (!ngo) {
      ngo = await NGO.create({
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email,
        requests: []
      });
    }

    // Get all donations requested by this NGO
    const donations = await Donation.find({ 
      requestedBy: ngo._id 
    })
      .populate("restaurant", "name email")
      .sort({ requestedAt: -1 }); // Most recent first

    // Calculate statistics
    const stats = {
      totalRequests: donations.length,
      acceptedRequests: donations.filter(d => d.status === "Accepted").length,
      completedRequests: donations.filter(d => d.status === "Completed").length,
      pendingRequests: donations.filter(d => d.status === "Requested").length,
      expiredRequests: donations.filter(d => d.status === "Expired").length,
      totalQuantityReceived: donations
        .filter(d => d.status === "Completed")
        .reduce((total, d) => {
          // Extract number from quantity string (e.g., "5kg" -> 5, "10 plates" -> 10)
          const match = d.quantity.match(/\d+/);
          return total + (match ? parseInt(match[0]) : 0);
        }, 0)
    };

    res.status(200).json({ 
      success: true, 
      donations, 
      stats,
      ngo: {
        name: ngo.name,
        email: ngo.email,
        totalRequests: stats.totalRequests,
        completedRequests: stats.completedRequests
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;