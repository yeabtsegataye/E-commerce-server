const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

const tokens = () => {
  return jwt.sign({ id }, process.env.SECRET, { expiresIn: "3d" });
};
const registerUser = async (req, res) => {
  const { Name, Email, password, pic, phone, Address } = req.body;
  try {
    const user = await User.signup(Name, Email, password, pic, phone, Address);
    const token = tokens(user._id);
    return res.status(200).json({ token, Email });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
const authUser = async (req, res) => {
  const { Email, password } = req.body;
  try {
    const user = await User.login(Email, password);

    const token = tokens(user._id);
    res.status(200).json({ token, Email });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  authUser,
};
