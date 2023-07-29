const User = require("../model/USERMODEL");

const jwt = require("jsonwebtoken");

const tokens = (id) => {
  return jwt.sign({ id }, process.env.SECRET, { expiresIn: "3d" });
};
const registerUser = async (req, res) => {
  const { Name, Email, password, pic, isAdmin, Phone, Address } = req.body;

  try {
    const user = await User.signup(
      Name,
      Email,
      password,
      pic,
      isAdmin,
      Phone,
      Address
    );
    const token = tokens(user._id);
    return res
      .status(200)
      .json({ token, Email, Address, Name, Phone, pic, isAdmin });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
const authUser = async (req, res) => {
  const { Email, password } = req.body;
  try {
    const user = await User.login(Email, password);
    const Address = user.Address;
    const Phone = user.Phone;
    const Name = user.Name;
    const pic = user.pic;
    const isAdmin = user.isAdmin;
    const token = tokens(user._id);
    res.status(200).json({ token, Email, Address, Name, Phone, pic, isAdmin });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  authUser,
};
