const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ITEMS_SCHEMA = new Schema(
  {
    Barcode: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      sparse: true,
    },
    Item_Name: { 
      type: String, 
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [100, "Item name cannot exceed 100 characters"]
    },
    Item_Description: { 
      type: String, 
      required: [true, "Item description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    Item_Brand: { 
      type: String, 
      required: [true, "Brand is required"],
      trim: true 
    },
    Item_Category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "catagory",
      required: [true, "Category is required"]
    },
    Item_Price: { 
      type: Number, 
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    Item_BoughtPrice: {
      type: Number,
      min: [0, "Bought price cannot be negative"],
      default: 0,
    },
    Item_SellingPrice: {
      type: Number,
      min: [0, "Selling price cannot be negative"],
      default: 0,
    },
    StockQty: {
      type: Number,
      min: [0, "Stock cannot be negative"],
      default: 0,
      index: true,
    },
    IsEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    SoldQty: {
      type: Number,
      min: [0, "Sold quantity cannot be negative"],
      default: 0,
      index: true,
    },
    Sales: [
      {
        qty: { type: Number, min: 1, required: true },
        soldAt: { type: Date, default: Date.now, index: true },
        sellingPrice: { type: Number, min: 0, required: true },
        boughtPrice: { type: Number, min: 0, default: 0 },
      },
    ],
    Item_Images: {
      type: String,
      required: [true, "Image is required"],
      default: "https://res.cloudinary.com/yeabtsega/image/upload/v1683738835/cld-sample-5.jpg",
    },
    Item_poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    Item_Status: { 
      type: String, 
      enum: ["available", "sold", "reserved"],
      default: "available" 
    },
    Item_Gender: {
      type: String,
      enum: ["male", "female", "unisex"],
      default: "unisex",
    },
    Item_Age: {
      type: Number,
      default: 0,
      min: [0, "Age cannot be negative"],
      max: [100, "Age cannot exceed 100"],
    },
    Item_Condition: { // Optional: Consider adding this field
      type: String,
      enum: ["new", "like_new", "good", "fair"],
      default: "good"
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
ITEMS_SCHEMA.index({ Item_Category: 1 });
ITEMS_SCHEMA.index({ Item_Status: 1 });
ITEMS_SCHEMA.index({ Item_poster: 1 });
ITEMS_SCHEMA.index({ createdAt: -1 });
ITEMS_SCHEMA.index({ Barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Item", ITEMS_SCHEMA);