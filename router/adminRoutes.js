const express = require("express");
const router = express.Router();
const User = require("../model/USERMODEL");
const catagory = require("../model/CATAGORY");
const items = require("../model/ITEMS");

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "No authentication token" });
    }
    
    // Verify token and get user
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Please authenticate" });
  }
};

// Get all users (admin only)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role
router.put("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isAdmin: role === 'admin' },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ban/Unban user
router.put("/users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const { isBanned } = req.body;
    const userId = req.params.id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { IsBan: isBanned },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics data
router.get("/analytics", requireAdmin, async (req, res) => {
  try {
    // Total users count
    const totalUsers = await User.countDocuments();
    
    // Total items count
    const totalItems = await items.countDocuments();
    
    // Category statistics
    const categories = await catagory.find();
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await items.countDocuments({ Item_Category: category._id });
        return {
          name: category.catagory_Name,
          items: itemCount,
          categoryId: category._id
        };
      })
    );
    
    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({ createdAt: { $gte: weekAgo } });
    const recentItems = await items.countDocuments({ createdAt: { $gte: weekAgo } });
    
    res.status(200).json({
      totalUsers,
      totalItems,
      categoryStats,
      recentActivity: {
        newUsers: recentUsers,
        newItems: recentItems,
        weekAgo: weekAgo.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create category (admin only)
router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const { catagory_Name, cat_description, cat_pic } = req.body;
    
    if (!catagory_Name || !cat_description || !cat_pic) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    const existingCategory = await catagory.findOne({ catagory_Name });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }
    
    const newCategory = await catagory.create({
      catagory_Name,
      cat_description,
      cat_pic
    });
    
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update category (admin only)
router.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { catagory_Name, cat_description, cat_pic } = req.body;
    const categoryId = req.params.id;
    
    const updateData = {};
    if (catagory_Name) updateData.catagory_Name = catagory_Name;
    if (cat_description) updateData.cat_description = cat_description;
    if (cat_pic) updateData.cat_pic = cat_pic;
    
    const updatedCategory = await catagory.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete category (admin only)
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Check if category has items
    const itemsCount = await items.countDocuments({ Item_Category: categoryId });
    if (itemsCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with existing items" 
      });
    }
    
    const deletedCategory = await catagory.findByIdAndDelete(categoryId);
    
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Add user (admin only)
router.post("/users", requireAdmin, async (req, res) => {
  try {
    const { 
      Name, 
      Email, 
      password, 
      Phone, 
      Address, 
      isAdmin,
      IsBan = false,
      pic = "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    } = req.body;
    
    // Validate required fields
    if (!Name || !Email || !password || !Phone || !Address) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ Email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Create new user
    const newUser = await User.signup(
      Name,
      Email,
      password,
      pic,
      isAdmin || false,
      Phone,
      IsBan,
      Address
    );
    
    // Return user without password
    const userResponse = {
      _id: newUser._id,
      Name: newUser.Name,
      Email: newUser.Email,
      Phone: newUser.Phone,
      Address: newUser.Address,
      pic: newUser.pic,
      isAdmin: newUser.isAdmin,
      IsBan: newUser.IsBan,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;