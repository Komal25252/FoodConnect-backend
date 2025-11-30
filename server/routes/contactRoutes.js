import express from "express";
import Contact from "../models/contactModel.js";

const router = express.Router();

// regex for validation
const nameRegex = /^[A-Za-z\s]+$/;
const emailRegex = /^[a-zA-Z][a-zA-Z0-9._%+-]*@gmail\.com$/;

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Server-side validation
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ success: false, message: "Invalid name format." });
    }
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Invalid Gmail address." });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Message too short." });
    }

    const newContact = new Contact({ name, email, message });
    await newContact.save();

    res.status(201).json({ success: true, message: "Message stored successfully!" });
  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;


// import express from "express";
// import Contact from "../models/contactModel.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const { name, email, message } = req.body;
//     const newContact = new Contact({ name, email, message });
//     await newContact.save();
//     res.status(201).json({ success: true, message: "Message stored successfully!" });
//   } catch (error) {
//     console.error("Error saving contact:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// export default router;
