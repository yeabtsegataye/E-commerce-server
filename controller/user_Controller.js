// const User = require("../model/USERMODEL")
const registerUser = async (req, res) => {
  return res.json({ try: "working registeruser" });
};
const authUser = async (req, res) => {
  return res.json({ trying: "working authuser" });
};

module.exports = {
  registerUser,
  authUser,
};
