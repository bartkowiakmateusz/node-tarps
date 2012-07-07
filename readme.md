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

Additionaly you can specify join direction:

```js
db.join("cities", "cities.id = users.city", "left").get("users", function(e, r, f){
	// query: 'SELECT * FROM users LEFT JOIN cities ON cities.id = users.city'
});
```

db.where(field, value, or_conjunction) or_conjunction - if true multiple instances will be joined by OR, if false or omitted instances will be joined by AND

db.where({field: value, field2: value2}, or_conjunction, operator) - standard operator is =, you can change another, i.e <=, <, >, >=, !=

db.where(clause, params) params should be array with parameters which replaces questions marks in the clause.

Produces where clause. May be called in 3 ways:

```js
// 1.
db.where("name", "John").get("users", function(e, r, f){
	// query: 'SELECT * FROM users WHERE name = 'John''
});

db.where("name!=", "John").get("users", function(e, r, f){
	// Note: you can specify operator adding it to the field
	// query: 'SELECT * FROM users WHERE name != 'John''
});

// 2.
db.where({name: "John", age: 25}).get("users", function(e, r, f){
	// query: 'SELECT * FROM users WHERE name = 'John' AND age = '25''
});

db.where({name: "John", age: 25}, true, "!=").get("users", function(e, r, f){
	// query: 'SELECT * FROM users WHERE name != 'John' OR age != '25''
});

// 3.
db.where("name = ? AND age = ?", ["John", 25]).get("users", function(e, r, f){
	// query: 'SELECT * FROM users WHERE name = 'John' AND age = '25''
});
```

db.order_by(field, direction)

db.order_by({field: direction, field2:direction})

Produces order by clause. You can call this function passing field and direction as strings or an object with all desired fields and directions. Allowed directions: ASC, DESC.

```js
db.order_by({name: "asc", age: "desc"}).get("users", function(e, r, f){
	// query: 'SELECT * FROM users ORDER BY name ASC, age DESC'
});
```

Insert
```js
db.insert("users", {name: "John", age: "25"}, function(e, r, f){
	// INSERT INTO userst (name, age) VALUES('John', '25')
});
```

Update
```js
db.where("id", "1").update("users", {name: "John"}, function(e, r, f){
	// UPDATE users SET name = 'John' WHERE id = '1'
});
```

db.query(String query, Array params, Function callback) - makes query utilizing prepared statements
```js
db.query("INSERT INTO users (name, age) VALUES (?,?)", ["John", 25], function(e, r, f){
	// ...
});
```

Readme still under construction...