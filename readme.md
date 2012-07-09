# Transactions - Active Record - Prepared Statement for node-mysql

## v 0.2

Done:

- select with: distinct, join, where, order by, limit
- insert, update, delete
- prepare, execute, deallocate
- query

To do:

- Active record: group by, having, insert ignore
- Transactions

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

Initializing:

```js
var config = {
	host     : '',
	user     : '',
	password : '',
	database : ''};
var db = require("./modules/tarps").init(config);
```

After obtaining db object from init function you can use to make operations in database.

db.get(String tableName, [Function callback]) 

Creates select query and executes it. Without setting any other clauses this query will be: 'SELECT * FROM tableName'. Callback is standard callback function known from node-mysql.

```js
db.get("users", function(err, rows, fields){
	// do something with returned rows
});
```

db.select(String fields)

db.select(Array fields)

Creates select clause, i.e. 'SELECT name, surname...'. If function is not called, all fields will be returned.

```js
db.select("name, surname").get("users", function(e, r, f){
	// query: 'SELECT name, surname FROM users' 
});

db.select(["name", "surname"]).get("users", function(e, r, f){
	// query: 'SELECT name, surname FROM users' 
});
```

db.distinct()

Produces distinct clause in the query - 'SELECT DISTINCT name FROM...'

db.join(String tableName, String field, [String direction])

Produces join clause, tableName and field are required.

```js
db.join("cities", "cities.id = users.city").get("users", function(e, r, f){
	// query: 'SELECT * FROM users JOIN cities ON cities.id = users.city'
});

// Additionaly you can specify join direction:

db.join("cities", "cities.id = users.city", "left").get("users", function(e, r, f){
	// query: 'SELECT * FROM users LEFT JOIN cities ON cities.id = users.city'
});
```

db.where(String field, String value, [Boolean or_conjunction]) or_conjunction - if true multiple instances will be joined by OR, if false or omitted instances will be joined by AND

db.where(Object fields_values_pairs, [Boolean or_conjunction], [String operator]) - standard operator is =, you can change another, i.e <=, <, >, >=, !=

db.where(String clause, Array params) params should be array with parameters which replaces questions marks in the clause.

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

db.order_by(String field, String direction)

db.order_by(Object fields_directions_pairs)

Produces order by clause. You can call this function passing field and direction as strings or an object with all desired fields and directions. Allowed directions: ASC, DESC.

```js
db.order_by("name", "asc").get("users", function(e, r, f){
	// query: 'SELECT * FROM users ORDER BY name ASC'
});

db.order_by({name: "asc", age: "desc"}).get("users", function(e, r, f){
	// query: 'SELECT * FROM users ORDER BY name ASC, age DESC'
});
```

db.insert(String tableName, Object fields_values_pairs, [Function callback])

Insert
```js
db.insert("users", {name: "John", age: "25"}, function(e, r, f){
	// INSERT INTO users (name, age) VALUES('John', '25')
});
```

db.update(String tableName, Object fields_values_pairs, [Function callback])

Update
```js
db.where("id", "1").update("users", {name: "John"}, function(e, r, f){
	// UPDATE users SET name = 'John' WHERE id = '1'
});
```

db.delete(String tableName, [Function callback])

Delete
```js
db.where("id", 1).delete("users", function(e, r, f){
	// DELETE FROM users WHERE id = '1'
});
```

db.query(String query, Array params, [Function callback]) - makes query utilizing prepared statements. 
```js
db.query("INSERT INTO users (name, age) VALUES (?,?)", ["John", 25], function(e, r, f){
	// ...
});
```

Note: this function prepares statement, executes it and deallocates immediately, thus you can only leverage prepared statement once. If you wish prepare statement and then execute it many times use prepare - execute - deallocate scheme described underneath.

## Preparing and executing statements 
You can prepare statement and then execute it many times, but in one connection (in one db object) you can have only one prepared statement. That means you have to invoke deallocate() before calling prepare() again. If you want use more than one prepared statement initialize another db object. Please do not use 'statement' for statement name, since it's used by query function to executes queries (that would cause problems if you called query() while having allocated statement).

db.prepare(String query, String statementName, [Function callback])

db.execute(Array params, [Function callback])

db.deallocate([Function callback])

```js
db.prepare("INSERT INTO users (name, age) VALUES (?,?)", "stmt")
	.execute("John", 30)
	.execute("Mary", 20)
	.execute("Chris", 42)
	.deallocate(function(e, r, f){
		// INSERT INTO users (name, age) VALUES('John', 30)
		// INSERT INTO users (name, age) VALUES('Mary', 20)
		// INSERT INTO users (name, age) VALUES('Chris', 42)
	});
```

Please feel free to let me know if something is unclear or missing.