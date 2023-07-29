const express = require("express");
const {
  handle_Items_post,
  handle_Items_get,
  handle_Items_put,
  handle_Items_delete,
} = require("../controller/items_Controller");
const Router = express.Router();

Router.post("/newitems", handle_Items_post);
Router.get("/allitems", handle_Items_get);
Router.put("/itemsedit", handle_Items_put);
Router.delete("/itemsdelete", handle_Items_delete);

module.exports = Router;
