var SqlG = require('../lib/sql-generator');
var sqlg = new SqlG("mysql");

exports['test_funtion'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    console.log(sqlg.insert("table" ,  { 'time' : {"function" : "FROM_UNIXTIME"}}) );
    assert.deepEqual( { sql: 'INSERT INTO table ( time ) VALUES ( FROM_UNIXTIME() )', values: [] },
                      sqlg.insert("table" ,  { 'time' : {"function" : "FROM_UNIXTIME"}}) );
    
    assert.deepEqual( { sql: 'INSERT INTO table ( time ) VALUES ( CONCAT(?,?,?) )', values: ["a" , "b" , "c"] },
                      sqlg.insert("table" , {'time' : {
                          "function" : "CONCAT" , 
                          "args" : ["a" , "b" , "c"]}}));
    
    if( typeof test.finish == 'function' ) test.finish();
};
