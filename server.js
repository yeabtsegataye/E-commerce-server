const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const user_router = require("./router/User_router");

require("dotenv").config();

const app = express();
app.use(cors());

mongoose
  .connect(process.env.MONGO_DB)
  .then(() => {
    // listen for requests
    app.listen(process.env.PROXY, () => {
      console.log("connected to db & listening on port", process.env.PROXY);
    });
  })
  .catch((error) => {
    console.log(error);
  });
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});
app.use("/ip/user", user_router);
