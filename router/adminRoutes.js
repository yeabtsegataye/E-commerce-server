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

// Sales analytics (profit + sold counts) with period grouping
// period: daily | weekly | monthly | all
router.get("/sales-analytics", requireAdmin, async (req, res) => {
  try {
    const period = (req.query.period || "daily").toLowerCase();
    const now = new Date();
    const start = new Date(req.query.start || "");
    const end = new Date(req.query.end || "");

    let startDate;
    let endDate;
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      startDate = start;
      endDate = end;
    } else {
      endDate = now;
      startDate = new Date(now);
      if (period === "weekly") startDate.setDate(startDate.getDate() - 7 * 12);
      else if (period === "monthly") startDate.setMonth(startDate.getMonth() - 12);
      else if (period === "all") startDate = new Date(0);
      else startDate.setDate(startDate.getDate() - 30);
    }

    const dateToLabel = {
      daily: { $dateToString: { format: "%Y-%m-%d", date: "$Sales.soldAt" } },
      weekly: { $dateToString: { format: "%G-W%V", date: "$Sales.soldAt" } }, // ISO week
      monthly: { $dateToString: { format: "%Y-%m", date: "$Sales.soldAt" } },
      all: { $literal: "all" },
    };

    const groupLabelExpr = dateToLabel[period] || dateToLabel.daily;

    const pipeline = [
      { $unwind: "$Sales" },
      {
        $match: {
          "Sales.soldAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $addFields: {
          soldRevenue: { $multiply: ["$Sales.qty", "$Sales.sellingPrice"] },
          soldCost: { $multiply: ["$Sales.qty", "$Sales.boughtPrice"] },
        },
      },
      {
        $group: {
          _id: groupLabelExpr,
          soldQty: { $sum: "$Sales.qty" },
          revenue: { $sum: "$soldRevenue" },
          cost: { $sum: "$soldCost" },
        },
      },
      {
        $addFields: {
          profit: { $subtract: ["$revenue", "$cost"] },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const series = await items.aggregate(pipeline);
    const totals = series.reduce(
      (acc, row) => {
        acc.soldQty += row.soldQty || 0;
        acc.revenue += row.revenue || 0;
        acc.cost += row.cost || 0;
        acc.profit += row.profit || 0;
        return acc;
      },
      { soldQty: 0, revenue: 0, cost: 0, profit: 0 }
    );

    res.status(200).json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totals,
      series: series.map((r) => ({
        label: r._id,
        soldQty: r.soldQty,
        revenue: r.revenue,
        cost: r.cost,
        profit: r.profit,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================
// Items management (admin)
// =========================

// Paged items list (default 10) with search + category + enabled filter
router.get("/items", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const categoryId = (req.query.categoryId || "").trim();
    const enabled = (req.query.enabled || "").trim(); // "true" | "false" | ""

    const filter = {};
    if (categoryId) filter.Item_Category = categoryId;
    if (enabled === "true") filter.IsEnabled = true;
    if (enabled === "false") filter.IsEnabled = false;
    if (search) {
      filter.$or = [
        { Item_Brand: { $regex: search, $options: "i" } },
        { Item_Name: { $regex: search, $options: "i" } },
        { Barcode: { $regex: search, $options: "i" } },
      ];
    }

    const [total, itemsList] = await Promise.all([
      items.countDocuments(filter),
      items
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("Item_Category")
        .populate("Item_poster"),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      hasMore: skip + itemsList.length < total,
      items: itemsList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lookup item by barcode
router.get("/items/by-barcode/:barcode", requireAdmin, async (req, res) => {
  try {
    const barcode = (req.params.barcode || "").trim();
    if (!barcode) return res.status(400).json({ message: "Barcode is required" });

    const item = await items
      .findOne({ Barcode: barcode })
      .populate("Item_Category")
      .populate("Item_poster");

    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enable/disable item visibility
router.put("/items/:id/enabled", requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { isEnabled } = req.body;
    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ message: "isEnabled must be boolean" });
    }

    const item = await items.findByIdAndUpdate(
      itemId,
      { IsEnabled: isEnabled },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark an item as sold (by barcode or itemId)
router.post("/items/sell", requireAdmin, async (req, res) => {
  try {
    const { barcode, itemId, qty } = req.body;
    const quantity = Math.max(parseInt(qty || "1", 10), 1);

    const query = itemId ? { _id: itemId } : barcode ? { Barcode: String(barcode).trim() } : null;
    if (!query) return res.status(400).json({ message: "barcode or itemId is required" });

    const item = await items.findOne(query);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if ((item.StockQty ?? 0) < quantity) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    const sellingPrice = item.Item_SellingPrice ?? item.Item_Price ?? 0;
    const boughtPrice = item.Item_BoughtPrice ?? 0;

    item.StockQty = (item.StockQty ?? 0) - quantity;
    item.SoldQty = (item.SoldQty ?? 0) + quantity;
    item.Sales = item.Sales || [];
    item.Sales.push({
      qty: quantity,
      soldAt: new Date(),
      sellingPrice,
      boughtPrice,
    });

    await item.save();
    res.status(200).json({ item });
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