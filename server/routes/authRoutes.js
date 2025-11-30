import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from 'google-auth-library';
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import NGO from "../models/NGO.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------------- REGISTER ----------------

// Common Register Handler
const handleRegister = async (req, res, role) => {
  try {
    const { name, email, phone, password, location } = req.body;
    
    console.log(`${role} registration request:`, { name, email, phone, location });

    // check existing
    const existingUser = await User.findOne({ email, role });
    if (existingUser) {
      return res.status(400).json({ message: `${role} already registered with this email` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Users collection
    const user = await User.create({
      name,
      email,
      phone: phone || "",
      password: hashedPassword,
      role,
    });

    // Create corresponding record in Restaurant or NGO collection
    let createdEntity;
    if (role === "restaurant") {
      createdEntity = await Restaurant.create({
        userId: user._id,
        name,
        email,
        phone: phone || "",
        location: location || null,
        donations: []
      });
      console.log("Created restaurant:", createdEntity);
    } else if (role === "ngo") {
      createdEntity = await NGO.create({
        userId: user._id,
        name,
        email,
        phone: phone || "",
        location: location || null,
        requests: []
      });
      console.log("Created NGO:", createdEntity);
    }

    res.status(201).json({ message: `${role} registered successfully`, user, entity: createdEntity });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NGO Register
router.post("/register-ngo", (req, res) => handleRegister(req, res, "ngo"));

// Restaurant Register
router.post("/register-restaurant", (req, res) => handleRegister(req, res, "restaurant"));


// ---------------- LOGIN ----------------

// Common Login Handler
const handleLogin = async (req, res, role) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: `${role} not found or invalid role` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// NGO Login
router.post("/login-ngo", (req, res) => handleLogin(req, res, "ngo"));

// Restaurant Login
router.post("/login-restaurant", (req, res) => handleLogin(req, res, "restaurant"));

// Get all NGOs (for map display)
router.get("/ngos", async (req, res) => {
  try {
    const ngos = await NGO.find({}, 'name email location').populate('userId', 'name email');
    res.json(ngos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all Restaurants (for map display)
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});
    console.log("All restaurants in database:", restaurants.length);
    restaurants.forEach((restaurant, index) => {
      console.log(`Restaurant ${index + 1}:`, {
        name: restaurant.name,
        email: restaurant.email,
        location: restaurant.location,
        hasLocation: !!restaurant.location,
        hasCoords: !!(restaurant.location?.latitude && restaurant.location?.longitude)
      });
    });
    
    // Return only restaurants with location data
    const restaurantsWithLocation = restaurants.filter(r => 
      r.location && r.location.latitude && r.location.longitude
    );
    
    console.log("Restaurants with valid location:", restaurantsWithLocation.length);
    res.json(restaurantsWithLocation);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Debug endpoint to check all restaurants
router.get("/debug/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});
    res.json({
      total: restaurants.length,
      restaurants: restaurants.map(r => ({
        name: r.name,
        email: r.email,
        location: r.location,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ---------------- GOOGLE AUTHENTICATION ----------------

// Google OAuth Login/Register
router.post('/google-auth', async (req, res) => {
  try {
    const { credential, role } = req.body;

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists with this email
    let user = await User.findOne({ email });

    if (user) {
      // User exists - check if role matches
      if (user.role !== role) {
        return res.status(400).json({ 
          message: `This email is already registered as a ${user.role}. Please use a different email or login as ${user.role}.` 
        });
      }

      // Existing user with matching role - login
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Check if user has location
      const needsLocation = !user.location || !user.location.latitude;

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          location: user.location,
          avatar: user.avatar
        },
        needsLocation
      });
    }

    // New user - register
    user = await User.create({
      name,
      email,
      password: await bcrypt.hash(googleId, 10), // Use Google ID as password
      role,
      avatar: picture,
      phone: ""
    });

    // Create corresponding entity (Restaurant or NGO) without location
    let createdEntity;
    if (role === "restaurant") {
      createdEntity = await Restaurant.create({
        userId: user._id,
        name,
        email,
        phone: "",
        location: null,
        donations: []
      });
    } else if (role === "ngo") {
      createdEntity = await NGO.create({
        userId: user._id,
        name,
        email,
        phone: "",
        location: null,
        requests: []
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: null,
        avatar: user.avatar
      },
      needsLocation: true
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Google authentication failed', error: error.message });
  }
});

// Update user location after Google auth
router.post('/update-location', async (req, res) => {
  try {
    const { userId, location, phone } = req.body;

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { location, phone },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update corresponding entity (Restaurant or NGO)
    if (user.role === 'restaurant') {
      await Restaurant.findOneAndUpdate(
        { userId: user._id },
        { location, phone }
      );
    } else if (user.role === 'ngo') {
      await NGO.findOneAndUpdate(
        { userId: user._id },
        { location, phone }
      );
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

export default router;
