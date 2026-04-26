const express = require("express");
const Router = express.Router();
const {
  authUser,
  handel_mypost,
  forgotPassword,
  resetPassword,
} = require("../controller/user_Controller");

Router.post("/login", authUser);
// Router.post("/signup", registerUser);
Router.post("/mypost", handel_mypost);
Router.post("/forgot-password", forgotPassword);
Router.post("/reset-password", resetPassword);

module.exports = Router;
