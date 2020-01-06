var express = require('express');
var router = express.Router();

const DataManager = require("../source/dataManager.js")

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express',
    data: DataManager.getExportData()
  });
});

module.exports = router;
