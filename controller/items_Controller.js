const items = require("../model/ITEMS");
const catagory = require("../model/CATAGORY");
const User = require("../model/USERMODEL");

const handle_Items_post = async (req, res) => {
  const {
    Item_Name,
    Item_Description,
    Item_Brand,
    Item_Price,
    Item_Images,
    Item_Category,
    Item_poster,
  } = req.body;
  if (
    !Item_Name ||
    !Item_Description ||
    !Item_Brand ||
    !Item_Price ||
    !Item_Images ||
    !Item_Category ||
    !Item_poster
  ) {
    return res.status(400).json({ message: "fill all the space" });
  }
  const checking_user = await User.findById({ _id: Item_poster });
  const checking_cat = await catagory.findById({ _id: Item_Category });
  if (!checking_cat) {
    return res.status(400).json({ message: "Unknown user" });
  }
  if (!checking_user) {
    return res.status(400).json({ message: "unautorized user" });
  }
  try {
    const item = await items.create({
      Item_Name,
      Item_Description,
      Item_Brand,
      Item_Price,
      Item_Images,
      Item_Category,
      Item_poster,
    });
    return res.status(200).json({ item });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
////////////////////////
const handle_Items_get = async (req, res) => {
  try {
    const all_Items = await items.find().populate("user").populate("catagory");
    return res.status(200).json({ all_Items });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
/////////////////////////////
const handle_Items_put = (req, res) => {
  return res.json({ message: "all working" });
};
///////////////////////////
const handle_Items_delete = async (req, res) => {
  const { user_id, item_id } = req.body;
  if (!user_id || !item_id) {
    return res.status(400).json({ message: "no user and item" });
  }
  const checking_user = await User.findById({ _id: user_id });
  if (!checking_user) {
    return res.status(400).json({ message: "unautorized user" });
  }
  const checking_item = await items.findById({ _id: item_id });
  if (!checking_item) {
    return res.status(400).json({ message: "unknown item" });
  }
  try {
    const deleting = await items.findById({ _id: item_id });
    return res.status(200).json({ deleting });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
module.exports = {
  handle_Items_post,
  handle_Items_get,
  handle_Items_put,
  handle_Items_delete,
};
