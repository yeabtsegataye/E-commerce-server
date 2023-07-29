const catagory = require("../model/CATAGORY");

const handle_cat_post = async (req, res) => {
  const { catagory_Name, cat_description, cat_pic } = req.body;

  if (!catagory_Name || !cat_description) {
    return res.status(400).json({ message: "fill all the space" });
  }

  try {
    const checking = await catagory.findOne({ catagory_Name });
    if (checking) {
      return res.status(400).json({ message: "category already exists" });
    }

    const catagorys = await catagory.create({
      catagory_Name,
      cat_description,
      cat_pic,
    });

    if (!catagorys) {
      return res.status(400).json({ message: "no category added" });
    }

    return res.status(200).json({ catagorys });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const handle_cat_get = (req, res) => {
  res.json({ message: "get" });
};
const handle_cat_put = (req, res) => {
  res.json({ message: "put" });
};
const handle_cat_delete = (req, res) => {
  res.json({ message: "delete" });
};

module.exports = {
  handle_cat_post,
  handle_cat_get,
  handle_cat_put,
  handle_cat_delete,
};
