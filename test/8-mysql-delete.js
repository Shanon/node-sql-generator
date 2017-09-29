var SqlG = require('../lib/sql-generator');
var sqlg = new SqlG("mysql");

exports['test_delete'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'DELETE FROM test', values: [] },
                      sqlg.delete( 'test', null ) );
    
    sqlg.delete( 'test', null, function( sql, values ) {
        assert.deepEqual( { sql: 'DELETE FROM test', values: [] },
                          { sql: sql, values: values } );
    } );

    assert.deepEqual( { sql: 'DELETE FROM test WHERE id = ?', values: [ 10 ] },
                      sqlg.delete( 'test', { id: 10 } ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};
