var _ = require("underscore");

module.exports = {
	// return tarps object
	init: function(config){
		return new tarps(config);
	},
	
	dbMiddleware: function(config){
	// return tarps object as middleware
		var self = this;
		return function(req, res, next){
			req.db = self.init(config);
			next();
		};
	}
};

tarps = function(config){
	var mysql = require('mysql');
	this.connection = mysql.createConnection(config);
	this.connection.connect();
	
	this.transactionQueries = [];
	this.autocommit = true;
	
	this.counter = 1;
	
	this.lastQuery = "";
	this.flush("");
	return this;
}

tarps.prototype.flush = function(lastQuery){
	this.lastQuery = lastQuery;
	
	//this.statementName = "";
	//this.psRollback = false;
	
	this.selectClause = "";
	this.distinctClause = "";
	this.joinClause = "";
	this.whereObject = {};
	this.orderByObject = {};
	this.limitObject = {clause: "", params: []};
}

tarps.prototype.flushTransaction = function(){
	this.autocommit = true;
	this.transactionQueries = [];
}

tarps.prototype.getName = function(){
	return "tarps"+this.counter++;
}

tarps.prototype.select = function(arg){
	if (typeof arg=="string" && arg.length>0){
		this.selectClause = arg;
	}
	else if(arg instanceof Array && arg.length>0){
		this.selectClause = arg.join();
	}
	return this;
};

tarps.prototype.distinct = function(){
	this.distinctClause = " DISTINCT";
	return this;
}

tarps.prototype.join = function(tableName, field, direction){
	if (tableName=="" || field=="")
		return this;

	allowedDirections = ["left", "right", "outer", "inner", "left outer", "right outer"];
	if (allowedDirections.indexOf(direction.toLowerCase())==-1){
		console.log("tarps.join() warning: Check if you haven't misspelled the direction of join clause");
	}
	this.joinClause += (typeof direction=="undefined"? "":" "+direction.toUpperCase())+" JOIN "+tableName+" ON "+field;
	return this;
}

// .where("name", "Mat", operator) string, string
// .where({name: "Mat"}, or, operator) object, bool
// .where("name=?", ["Mat"]) string, array

tarps.prototype.where = function(){
	arg = arguments;
	if (typeof arg[0]=="string" && (typeof arg[1]=="string" || typeof arg[1]=="number")){
		var operator = (arg[2]?arg[2]:"=");
		this.whereObject[arg[0]+operator] = a = {};
		a.text = arg[1];
	}
	if(typeof arg[0]=="object"){
		var operator = (arg[2]?arg[2]:"=");
		for (var i in arg[0]){
			this.whereObject[i+operator] = a = {};
			a.text = arg[0][i];
			a.or = (arg[1]===true);
		}
	}
	if (typeof arg[0]=="string" && arg[1] instanceof Array){
		if (!_.isEmpty(this.whereObject)){
			throw new Error("tarps.where(): You can only call where method in this way, when you haven't already called it before in the same query.");
		}
		this.whereObject.readyClause = arg[0];
		this.whereObject.params = arg[1];
	}
	
	return this;
}

tarps.prototype.order_by = function(){
	arg = arguments;
	if (typeof arg[0]=="object"){
		for (i in arg[0]){
			this.orderByObject[i] = arg[0][i];
		}
	}
	else if (typeof arg[0]=="string" && typeof arg[1]=="string"){
		this.orderByObject[arg[0]] = arg[1];
	}
	return this;
}

tarps.prototype.limit = function(limit, offset){
	if (typeof limit=="number"){
		var a = this.limitObject;
		a.clause += " LIMIT ?";
		a.params.push(limit);
		
		if (typeof offset=="number"){
			a.clause += ", ?";
			a.params.push(offset);
		}
	}
	return this;
}

tarps.prototype.get = function(tableName, callback){
	var whereData = buildWhereClause(this.whereObject);
	
	var selectQuery = buildSelectQuery({
		tableName: tableName,
		distinctClause: this.distinctClause,
		selectClause: this.selectClause,
		joinClause: this.joinClause,
		whereClause: whereData.clause,
		orderByClause: buildOrderByClause(this.orderByObject),
		limitClause: this.limitObject.clause
	});
	
	var params = [];
	if (whereData.params.length>0){
		params = params.concat(whereData.params);
	}
	
	if (this.limitObject.params.length>0){
		params = params.concat(this.limitObject.params);
	}
	
	if (this.autocommit){
		this.executeQuery(selectQuery, params, callback);
	}
	else{
		this.addToTransaction(selectQuery, params, callback);
		return this;
	}
}

tarps.prototype.insert = function(tableName, data, callback){
	var values = _.values(data);
	if (values.length<1){
		throw new Error("tarps.insert(): Nothing to insert.");
	}

	var valueString;
	var	valueArray = [];
	for (var i=1;i<=values.length;i++){
		valueArray.push("?");
	}
	valueString = valueArray.join();
	var insertQuery = "INSERT INTO "+tableName+" ("+_.keys(data).join()+") VALUES ("+valueString+")";
	
	if (this.autocommit){
		this.executeQuery(insertQuery, values, callback);
	}
	else{
		this.addToTransaction(insertQuery, values, callback);
		return this;
	}
}

tarps.prototype.update = function(tableName, data, callback){	
	var values = _.values(data);
	if (values.length<1){
		throw new Error("tarps.update(): Nothing to update");
	}
	var pairs = _.map(data, function(value, key){
		return key+"=?";
	});
	
	var whereData = buildWhereClause(this.whereObject);
	
	var updateQuery = "UPDATE "+tableName
	+" SET "+pairs.join()
	+whereData.clause
	+buildOrderByClause(this.orderByObject)
	+this.limitObject.clause
	;
	
	var params = [];
	
	params = params.concat(values);
	if (whereData.params.length>0){
		params = params.concat(whereData.params);
	}
	if (this.limitObject.params.length>0){
		params = params.concat(this.limitObject.params);
	}
	
	if (this.autocommit){
		this.executeQuery(updateQuery, params, callback);
	}
	else{
		this.addToTransaction(updateQuery, params, callback);
		return this;
	}
}

tarps.prototype.delete = function(tableName, callback){
	var whereData = buildWhereClause(this.whereObject);
	
	var deleteQuery = "DELETE FROM "+tableName
	+whereData.clause
	+buildOrderByClause(this.orderByObject)
	+this.limitObject.clause
	;
	
	var params = [];
	if (whereData.params.length>0){
		params = params.concat(whereData.params);
	}
	if (this.limitObject.params.length>0){
		params = params.concat(this.limitObject.params);
	}
	
	if (this.autocommit){
		this.executeQuery(deleteQuery, params, callback);
	}
	else{
		this.addToTransaction(deleteQuery, params, callback);
		return this;
	}
}

tarps.prototype.query = function(query, params, callback){
	if (this.autocommit){
		this.executeQuery(query, params, callback);
	}
	else{
		this.addToTransaction(query, params, callback);
		return this;
	}
}

tarps.prototype.executeQuery = function(query, params, callback){
	var conn = this.connection;
	var statementName = this.getName();
	conn.query("PREPARE "+statementName+" FROM \'"+query+"\'");
	
	var usingClause = this.setUsingClause(params);
	conn.query("EXECUTE "+statementName+usingClause, callback);
	conn.query("DEALLOCATE PREPARE "+statementName);
	this.flush(query);
}

tarps.prototype.addToTransaction = function(query, params, callback){
	if (typeof callback=="undefined"){
		callback = function(e){};
	}
	this.transactionQueries.push({query: query, params: params, callback: callback});
	this.flush(query);
}

tarps.prototype.transaction = function(){
	this.autocommit = false;
	return this;
}

tarps.prototype.commit = function(callback){
	var conn = this.connection;
	conn.query("START TRANSACTION");
	var self = this;
	
	function series(item){
		if (item){
			self.executeQuery(item.query, item.params, function(e, r, f){
				item.callback(e, r, f);
				if (e){
					conn.query("ROLLBACK", callback);
					self.flushTransaction();
				}
				else{
					series(self.transactionQueries.shift());
				}
			});
		}
		else{
			conn.query("COMMIT", callback);
			self.flushTransaction();
		}
	}
	series(self.transactionQueries.shift());
}

tarps.prototype.simpleQuery = function(query, callback){
	this.connection.query(query, callback);
}

tarps.prototype.setUsingClause = function(params){
	var conn = this.connection;
	var usingClause = "";
		if (!_.isEmpty(params)){
			var stmtVars = [];
			for (var i in params){
				var varName = "@"+this.getName();
				conn.query("SET "+varName+"=\'"+params[i]+"\'");
				stmtVars.push(varName);
			}
			usingClause = " USING "+stmtVars.join();
		}
	return usingClause;
}

tarps.prototype.invokeCallback = function(callback, e, r, f){
	if (typeof callback!="function"){
		if (e){
			console.log("Error occured: "+e);
		}
	}
	else{
		callback(e, r, f);
	}
}

tarps.prototype.end = function(){
	this.connection.end();
}

buildSelectQuery = function(c){ // clauses
	return "SELECT"
		+c.distinctClause
		+" "+(c.selectClause==""? "*":c.selectClause)
		+" FROM "+c.tableName
		+c.joinClause
		+c.whereClause
		+c.orderByClause
		+c.limitClause
		;
}

buildWhereClause = function(whereObject){
	if (_.isEmpty(whereObject)){
		return {clause: "", params: []};
	}
	
	if (whereObject.readyClause && whereObject.params){
		return {clause: " WHERE "+whereObject.readyClause, params: whereObject.params};
	}
	
	startingClause = " WHERE";
	readyClause = startingClause;
	params = [];
	for (i in whereObject){
		readyClause += (readyClause==startingClause?"":(whereObject[i].or==true?" OR":" AND"));
		readyClause += " "+i+"?";
		params.push(whereObject[i].text);
	}
	return {clause: readyClause, params: params};
}

buildOrderByClause = function(orderByObject){
	if (_.isEmpty(orderByObject))
		return "";
	
	startingClause = " ORDER BY";
	readyClause = startingClause;
	
	for (i in orderByObject){
		readyClause+=(readyClause==startingClause? "":",")+" "+i+" "+orderByObject[i].toUpperCase();
	}
	return readyClause;
}
