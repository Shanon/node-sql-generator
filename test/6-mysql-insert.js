var SqlG = require('../lib/sql-generator');
var sqlg = new SqlG("mysql");

exports['test_insert'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'INSERT INTO test ( foo, bar ) VALUES ( ?, ? )', values: [ 1, 2 ] },
                      sqlg.insert( 'test', { foo: 1, bar: 2 } ) );
    sqlg.insert( 'test', { foo: 1, bar: 2 }, function( sql, values ) {
        assert.deepEqual( { sql: 'INSERT INTO test ( foo, bar ) VALUES ( ?, ? )', values: [ 1, 2 ] },
                          { sql: sql, values: values } );
    } );
    
    assert.deepEqual( { sql: 'INSERT INTO test ( foo ) VALUES ( ? )', values: [ '{1,2}' ] },
                      sqlg.insert( 'test', { foo: [ 1, 2 ] } ) );
    
    assert.deepEqual( { sql: 'INSERT INTO test ( foo ) VALUES ( ARRAY[?, ?] )', values: [ 'a', 'b' ] },
                      sqlg.insert( 'test', { foo: [ 'a', 'b' ] } ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};
