exports.init = function(connection){
	return new setStatementParams(connection);
}

setStatementParams = function(connection){
	this.indexCode = 96; // 96 = a
	this.conn = connection;
	return this;
}

setStatementParams.prototype.setParams = function(params){
	for (var i in params){
		this.indexCode++;
		// 122 = z
		if (this.indexCode>122)
			throw new Error("tarps.get(): Number of allowed prepare statement params has been exceeded. This restriction will be removed in future versions.");
		this.conn.query("SET @"+String.fromCharCode(this.indexCode)+" = \""+params[i]+"\"");
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