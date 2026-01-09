const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ITEMS_SCHEMA = new Schema(
  {
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
      default: "male",
      required: [true, "Gender is required"]
    },
    Item_Age: { 
      type: Number, 
      required: [true, "Age is required"],
      min: [0, "Age cannot be negative"],
      max: [100, "Age cannot exceed 100"]
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

module.exports = mongoose.model("Item", ITEMS_SCHEMA);