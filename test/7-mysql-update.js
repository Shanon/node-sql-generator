var SqlG = require('../lib/sql-generator');
var sqlg = new SqlG("mysql");

exports['test_update'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'UPDATE test SET foo = ?, bar = ?', values: [ 1, 2 ] },
                      sqlg.update( 'test', null, { foo: 1, bar: 2 } ) );
    
    sqlg.update( 'test', null, { foo: 1, bar: 2 }, function( sql, values ) {
        assert.deepEqual( { sql: 'UPDATE test SET foo = ?, bar = ?', values: [ 1, 2 ] },
                          { sql: sql, values: values } );
    } );

    
    assert.deepEqual( { sql: 'UPDATE test SET foo = ?, bar = ? WHERE id = ?', values: [ 1, 2, 10 ] },
                      sqlg.update( 'test', { id: 10 }, { foo: 1, bar: 2 } ) );

    
    assert.deepEqual( { sql: 'UPDATE test SET foo = ?', values: [ '{1,2}' ] },
                      sqlg.update( 'test', null, { foo: [ 1, 2 ] } ) );
    
    assert.deepEqual( { sql: 'UPDATE test SET foo = ARRAY[?, ?]', values: [ 'a', 'b' ] },
                      sqlg.update( 'test', null, { foo: [ 'a', 'b' ] } ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};
