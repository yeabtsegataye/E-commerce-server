const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const user_router = require("./router/User_router");

require("dotenv").config();

const app = express();
app.use(cors());
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});
app.use("/ip/user", user_router);
