import NGO from "../models/NGO.js";
import Restaurant from "../models/Restaurant.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Generate Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Register NGO
export const registerNGO = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const ngo = await NGO.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "NGO Registered Successfully", ngo });
  } catch (error) {
    res.status(400).json({ message: "NGO Registration Failed", error });
  }
};

// Register Restaurant
export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const restaurant = await Restaurant.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "Restaurant Registered Successfully", restaurant });
  } catch (error) {
    res.status(400).json({ message: "Restaurant Registration Failed", error });
  }
};

// Login NGO
export const loginNGO = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ngo = await NGO.findOne({ email });

    if (ngo && (await bcrypt.compare(password, ngo.password))) {
      res.json({ token: generateToken(ngo._id, "ngo") });
    } else {
      res.status(401).json({ message: "Invalid Credentials" });
    }
  } catch (error) {
    res.status(400).json({ message: "NGO Login Failed", error });
  }
};

// Login Restaurant
export const loginRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;
    const restaurant = await Restaurant.findOne({ email });

    if (restaurant && (await bcrypt.compare(password, restaurant.password))) {
      res.json({ token: generateToken(restaurant._id, "restaurant") });
    } else {
      res.status(401).json({ message: "Invalid Credentials" });
    }
  } catch (error) {
    res.status(400).json({ message: "Restaurant Login Failed", error });
  }
};
