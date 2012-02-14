var SqlG;

exports['test_load_module'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    SqlG = require('sql-generator');
    assert.ok( typeof SqlG === 'function');
    if( typeof test.finish == 'function' ) test.finish();
};
exports['test_create_object'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    var sqlg = new SqlG();
    assert.ok( typeof sqlg === 'object');
    if( typeof test.finish == 'function' ) test.finish();
};

