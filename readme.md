Transactions - Active Record - Prepared Statement for node-mysql

v 0.1

Done:
Active record: select with: distinct, join, where, order by, limit

To do:
Active record: group by, having, insert, update
Prepared statements as a indyvidual function (currently select query made by active record utilizes prepare statements)
Transactions

Example:
```js
var express = require("express");
var app = express.createServer();

var config = {
	host     : 'localhost',
	user     : 'root',
	password : 'pass',
	database : 'test'};

var db = require("../modules/tarps").init(config);

db
	.where({id: 2})
	.get("users", function(err, rows, fields){
		console.log(rows);
});

app.listen(80);
```

Documentation:

Initializing:

```js
var config = {
	host     : '',
	user     : '',
	password : '',
	database : ''};
var db = require("./modules/tarps").init(config);
```

Active record:

After obtaining db object from init function you can use to make operations in database. Currently only select is supported

db.get(tableName, callback) 

Creates select query and executes it. Without setting any other clauses this query will be: 'SELECT * FROM tableName'. Callback is standard callback function known from node-mysql.

```js
db.get("users", function(err, rows, fields){
	// do something with returned rows
});
```

db.select(fields)

Creates select clause, i.e. 'SELECT name, surname...'. If function is not called, all fields will be returned.

```js
db.select("name, surname").get("users", function(e, r, f){
	// query: 'SELECT name, surname FROM users' 
});
```

db.distinct()

Produces distinct clause in the query - 'SELECT DISTINCT name FROM...'

db.join(tableName, field, [direction])

Produces join clause, tableName and field are required.

```js
db.join("cities", "cities.id = users.city").get("users", function(e, r, f){
	// query: 'SELECT * FROM users JOIN cities ON cities.id = users.city'
});
```

Additionaly you can specify join direction.

Readme still under construction...