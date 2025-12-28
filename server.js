// Load environment variables FIRST - BEFORE ANYTHING ELSE
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const user_router = require("./router/User_router");
const cat_router = require("./router/Catagory_router");
const items_router = require("./router/Items_router");
const adminRoutes = require("./router/adminRoutes");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_DB)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("✅ Connected to MongoDB");
      console.log("🚀 Server running on port", process.env.PORT);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use("/ip/user", user_router);
app.use("/ip/cat", cat_router);
app.use("/ip/item", items_router);
app.use("/api/admin", adminRoutes);
