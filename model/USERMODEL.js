const mongoose = require("mongoose");
const schema = mongoose.Schema;

const USERSCHEMA = schema({
  Name: { type: "String", required: true },
  Email: { type: "String", required: true },
  password: { type: "String", required: true },
  pic: {
    type: "String",
    required: true,
    default:
      "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  Phone: { type: "Number", required: true },
  Address: { type: "String", required: true },
  //   Ads: { type: mongoose.Schema.Types.ObjectId, ref: "ITEMS" },
});

module.exports = mongoose.model("user", USERSCHEMA);
