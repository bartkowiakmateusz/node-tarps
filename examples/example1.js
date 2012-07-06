var express = require("express");
var app = express.createServer();


var config = {
	host     : 'localhost',
	user     : 'root',
	password : 'pass',
	database : 'test'};

var db = require("../modules/tarps").active_record(config);


db
	.where({id: 2})
	.get("users", function(err, rows, fields){
	console.log(rows);
});


app.listen(80);