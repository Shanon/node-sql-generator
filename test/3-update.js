var SqlG = require('sql-generator');
var sqlg = new SqlG();

exports['test_update'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'UPDATE test SET foo = $1, bar = $2', values: [ 1, 2 ] },
                      sqlg.update( 'test', null, { foo: 1, bar: 2 } ) );
    
    sqlg.update( 'test', null, { foo: 1, bar: 2 }, function( sql, values ) {
        assert.deepEqual( { sql: 'UPDATE test SET foo = $1, bar = $2', values: [ 1, 2 ] },
                          { sql: sql, values: values } );
    } );

    
    assert.deepEqual( { sql: 'UPDATE test SET foo = $1, bar = $2 WHERE id = $3', values: [ 1, 2, 10 ] },
                      sqlg.update( 'test', { id: 10 }, { foo: 1, bar: 2 } ) );

    
    assert.deepEqual( { sql: 'UPDATE test SET foo = $1', values: [ '{1,2}' ] },
                      sqlg.update( 'test', null, { foo: [ 1, 2 ] } ) );
    
    assert.deepEqual( { sql: 'UPDATE test SET foo = ARRAY[$1, $2]', values: [ 'a', 'b' ] },
                      sqlg.update( 'test', null, { foo: [ 'a', 'b' ] } ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};