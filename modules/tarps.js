var _ = require("underscore");

exports.init = function(config){
	return new tarps(config);
}

tarps = function(config){
	var mysql = require('mysql');
	this.connection = mysql.createConnection(config);
	this.connection.connect();
	
	this.lastQuery = "";
	this.flush("");
	return this;
}

tarps.prototype.flush = function(lastQuery){
	this.lastQuery = lastQuery;
	
	this.selectClause = "";
	this.distinctClause = "";
	this.joinClause = "";
	this.whereObject = {};
	this.orderByObject = {};
	this.limitObject = {clause: "", params: []};
}

tarps.prototype.select = function(arg){
	if (typeof(arg)=="string" && arg.length>0){
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
	this.joinClause += (typeof(direction)=="undefined"? "":" "+direction.toUpperCase())+" JOIN "+tableName+" ON "+field;
	return this;
}

// .where("name", "Mat", operator) string, string
// .where({name: "Mat"}, or, operator) object, bool
// .where("name=?", ["Mat"]) string, array

tarps.prototype.where = function(){
	arg = arguments;
	if (typeof(arg[0])=="string" && typeof(arg[1])=="string"){
		var operator = (arg[2]?arg[2]:"=");
		this.whereObject[arg[0]+operator] = a = {};
		a.text = arg[1];
	}
	if(typeof(arg[0])=="object"){
		var operator = (arg[2]?arg[2]:"=");
		for (var i in arg[0]){
			this.whereObject[i+operator] = a = {};
			a.text = arg[0][i];
			a.or = (arg[1]===true);
		}
	}
	if (typeof(arg[0])=="string" && arg[1] instanceof Array){
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
	if (typeof(arg[0])=="object"){
		for (i in arg[0]){
			this.orderByObject[i] = arg[0][i];
		}
	}
	else if (typeof(arg[0])=="string" && typeof(arg[1]=="string")){
		this.orderByObject[arg[0]] = arg[1];
	}
	return this;
}

tarps.prototype.limit = function(limit, offset){
	if (typeof(limit)=="number"){
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
	var whereClause = buildWhereClause(this.whereObject);
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
	
	var conn = this.connection;
	console.log(selectQuery);
	conn.query("PREPARE statement FROM \'"+selectQuery+"\'");
	
	setParamsObject = new setStatementParams(conn);
	
	if (whereData.params.length>0){
		setParamsObject.setParams(whereData.params);
	}
	
	if (this.limitObject.params.length>0){
		setParamsObject.setParams(this.limitObject.params);
	}
	var usingClause = setStatementParams.setUsingClause();
	
	conn.query("EXECUTE statement"+usingClause, callback);
	conn.query("DEALLOCATE PREPARE statement");
	
	this.flush(selectQuery);
}

tarps.prototype.insert = function(tableName, data){
	var valueString;
	var	valueArray = [];
	for (var i=1;i<=_.values(data).length;i++){
		valueArray.push("?");
	}
	valueString = valueArray.join();
	var insertQuery = "INSERT INTO "+tableName+" ("+_.keys(data).join()+") VALUES ("+valueString+")";
	console.log(insertQuery);
}

function setStatementParams(connection){
	this.indexCode = 96; // 96 = a
	this.conn = connection;
}

setStatementParams.prototype.setParams = function(params){
	for (var i in params){
		this.indexCode++;
		// 122 = z
		if (this.indexCode>122)
			throw new Error("tarps.get(): Number of allowed prepare statement params has been exceeded. This restriction will be removed in future versions.");
		conn.query("SET @"+String.fromCharCode(this.indexCode)+" = \""+params[i]+"\"");
	}
}

setStatementParams.prototype.setUsingClause = function(){
	if (this.indexCode>96){
		var usedIndexes = [];
		for (var i=97;i<=this.indexCode;i++){
			usedIndexes.push("@"+String.fromCharCode(i));
		}	
	}
	
	return (this.indexCode>96?" USING "+usedIndexes.join():"");
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
		readyClause+=(readyClause==startingClause? "":",")+" "+i+" "+orderByObject[i];
	}
	return readyClause;
}
