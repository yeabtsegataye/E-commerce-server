const jwt = require("jsonwebtoken");
const items = require("../model/ITEMS");
const catagory = require("../model/CATAGORY");
const User = require("../model/USERMODEL");
const upload = require("../middleware/multer");
const { uploadToCloudinary } = require("../utils/cloudinary");

const handle_Items_post = [
  upload.single("Item_Images"), // Single file upload

  async (req, res) => {
    try {
      const {
        Barcode,
        Item_Name,
        Item_Description,
        Item_Brand,
        Item_Price,
        Item_BoughtPrice,
        Item_SellingPrice,
        StockQty,
        IsEnabled,
        Item_Category,
        Item_poster,
        Item_Status,
        Item_Age,
        Item_Gender
      } = req.body;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Please upload an image" });
      }

      const sellingInput =
        Item_SellingPrice != null && Item_SellingPrice !== ""
          ? Number(Item_SellingPrice)
          : Number(Item_Price);

      // Validate required fields
      if (
        !Item_Name ||
        !Item_Description ||
        !Item_Brand ||
        !Item_Category ||
        !Item_poster ||
        Number.isNaN(sellingInput) ||
        sellingInput < 0
      ) {
        return res
          .status(400)
          .json({ message: "Please fill all required fields (including selling price)" });
      }

      // Verify user exists
      const checking_user = await User.findById(Item_poster);
      if (!checking_user) {
        return res.status(401).json({ message: "Unauthorized user" });
      }

      // Verify category exists
      const checking_cat = await catagory.findById(Item_Category);
      if (!checking_cat) {
        return res.status(400).json({ message: "Unknown category" });
      }

      // Upload image to Cloudinary
      let cloudinaryResult;
      try {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
          folder: "ecommerce-items",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto:good" },
          ],
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload image" });
      }

      const bought =
        Item_BoughtPrice != null && Item_BoughtPrice !== ""
          ? Number(Item_BoughtPrice)
          : 0;

      // Create item with Cloudinary image data
      let item = await items.create({
        Barcode: Barcode?.trim() || undefined,
        Item_Name,
        Item_Description,
        Item_Brand,
        // Backwards compatibility: Item_Price is selling price
        Item_Price: sellingInput,
        Item_BoughtPrice: bought,
        Item_SellingPrice: sellingInput,
        StockQty:
          StockQty != null && StockQty !== "" ? Number(StockQty) : undefined,
        IsEnabled: IsEnabled != null ? String(IsEnabled) === "true" : undefined,
        Item_Images: cloudinaryResult.secure_url, // Just the URL string
        Item_Category,
        Item_poster,
        Item_Status,
        Item_Age:
          Item_Age != null && Item_Age !== "" ? Number(Item_Age) : 0,
        Item_Gender: Item_Gender || "unisex",
      });

      // Populate references
      item = await item.populate("Item_Category");
      item = await item.populate("Item_poster");

      return res.status(201).json({
        message: "Item created successfully",
        item: {
          ...item.toObject(),
          Item_Images: cloudinaryResult.secure_url, // Send URL for frontend
        },
      });
    } catch (error) {
      console.error("Error creating item:", error);
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Barcode already exists" });
      }
      return res.status(500).json({
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
];
////////////////////////
const handel_Items_one = async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "no category found" });
  }
  try {
    const cat_one = await items.find({ Item_Category: id });
    if (!cat_one) {
      return res.status(400).json({ message: "no category found" });
    }
    return res.status(200).json({ cat_one });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//////////////////////
const handle_UserItems_get = async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "no category found" });
  }
  try {
    const cat_one = await items.find({ Item_poster: id });
    if (!cat_one) {
      return res.status(400).json({ message: "no category found" });
    }
    return res.status(200).json({ cat_one });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
////////////////////////
const handle_AllItems_get = async (req, res) => {
  try {
    const all_Items = await items
      .find({ IsEnabled: true })
      .sort({ createdAt: -1 })
      .select("-Item_BoughtPrice -Sales.boughtPrice")
      .populate("Item_poster")
      .populate("Item_Category");
    return res.status(200).json({ all_Items });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//////////////////////////
const handle_oneItems_get = async (req, res) => {
  const id = req.params.id;
  try {
    let isAdmin = false;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(auth.split(" ")[1], process.env.SECRET);
        const u = await User.findById(decoded.id).select("isAdmin");
        isAdmin = u?.isAdmin === true;
      } catch {
        isAdmin = false;
      }
    }

    let q = items.findById(id).populate("Item_poster").populate("Item_Category");
    if (!isAdmin) {
      q = q.select("-Item_BoughtPrice -Sales");
    }
    const all_Items = await q;
    if (!all_Items) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (!isAdmin && all_Items.IsEnabled === false) {
      return res.status(404).json({ message: "Item not found" });
    }
    return res.status(200).json({ all_Items });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
/////////////////////////////
const handle_Items_put = async (req, res) => {
  const {
    Item_Name,
    Item_Description,
    Item_Brand,
    Item_Price,
    Item_Images,
    Item_Category,
     Item_Status,
        Item_Age,
        Item_Gender,
    Item_id,
    user_id,
  } = req.body;

  if (!Item_id || !user_id) {
    return res.status(400).json({ message: "unknown item or user" });
  }

  const changing = {};

  if (Item_Name) {
    changing.Item_Name = Item_Name;
  }

  if (Item_Description) {
    changing.Item_Description = Item_Description;
  }

  if (Item_Brand) {
    changing.Item_Brand = Item_Brand;
  }

  if (Item_Price) {
    changing.Item_Price = Item_Price;
  }

  if (Item_Images) {
    changing.Item_Images = Item_Images;
  }

  if (Item_Category) {
    changing.Item_Category = Item_Category;
  }
  if (Item_Status) {
    changing.Item_Status = Item_Status;
  }

  if (Item_Age) {
    changing.Item_Age = Item_Age;
  }

  if (Item_Gender) {
    changing.Item_Gender = Item_Gender;
  }
  try {
    const checking_user = await User.findById(user_id);
    const checking_item = await items.findById(Item_id);

    if (!checking_user || !checking_item) {
      return res.status(400).json({ message: "unauthorized user or item" });
    }
    const item = await items.findByIdAndUpdate(Item_id, changing, {
      new: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.status(200).json({ message: "Item updated successfully", item });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
///////////////////////////
const handle_Items_delete = async (req, res) => {
  const { user_id, item_id } = req.body;
  if (!user_id || !item_id) {
    return res.status(400).json({ message: "no user and item" });
  }
  try {
    const checking_user = await User.findById(user_id);
    const checking_item = await items.findById(item_id);

    if (!checking_user || !checking_item) {
      return res.status(400).json({ message: "unauthorized user or item" });
    }

    const deleting = await items.findByIdAndDelete(item_id);
    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
///////////////////////////
const handle_Items_search = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { Item_Brand: { $regex: req.query.search, $options: "i" } },
          { Item_Name: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const Item = await items
    .find({ ...keyword, IsEnabled: true })
    .select("-Item_BoughtPrice -Sales.boughtPrice");
  //
  return res.json({ Item });
};
module.exports = {
  handle_Items_search,
  handle_Items_post,
  handle_AllItems_get,
  handle_Items_put,
  handle_Items_delete,
  handel_Items_one,
  handle_oneItems_get,
  handle_UserItems_get,
};
