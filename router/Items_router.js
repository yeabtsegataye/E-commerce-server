const express = require("express");
const {
  handle_Items_post,
  handle_AllItems_get,
  handle_Items_put,
  handle_Items_delete,
  handle_Items_search,
} = require("../controller/items_Controller");
const Router = express.Router();

Router.post("/newitems", handle_Items_post);
Router.get("/allitems", handle_AllItems_get);
Router.put("/itemsedit", handle_Items_put);
Router.delete("/itemsdelete", handle_Items_delete);
Router.get("/", handle_Items_search);

module.exports = Router;
