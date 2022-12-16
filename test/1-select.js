var util = require('util');

var SqlG = require('../lib/sql-generator');
var sqlg = new SqlG();


exports['test_simple'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    
    assert.deepEqual( { sql: 'SELECT * FROM test', values: [] },
                      sqlg.select('test') );
    
    assert.deepEqual( { sql: 'SELECT * FROM test', values: [] },
                      sqlg.select('test','*') );
    
    sqlg.select( 'test', '*', {}, {}, function( sql, values ) {
        assert.deepEqual( { sql: 'SELECT * FROM test', values: [] },
                          { sql: sql, values: values } );
    } );
    if( typeof test.finish == 'function' ) test.finish();
};
exports['test_multi_table'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'SELECT * FROM test, sample', values: [] },
                      sqlg.select( ['test','sample'] ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test AS t, sample', values: [] },
                      sqlg.select( [ { 'test': 't' }, 'sample'] ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};
exports['test_columns_specified'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    
    assert.deepEqual( { sql: 'SELECT id, foo, bar FROM test', values: [] },
                      sqlg.select('test','id, foo, bar') );
    
    
    assert.deepEqual( { sql: 'SELECT id, hoge, fuga FROM test', values: [] },
                      sqlg.select('test', ['id', 'hoge', 'fuga' ] ) );
    
    assert.deepEqual( { sql: 'SELECT test.id AS id, test.fuga AS fuga FROM test', values: [] },
                      sqlg.select('test', { 'test.id': 'id', 'test.fuga': 'fuga' } ) );
    
    assert.deepEqual( { sql: 'SELECT test.id AS id, test.fuga AS fuga, test2.id AS 2_id FROM test', values: [] },
                      sqlg.select('test', [ { 'test.id': 'id', 'test.fuga': 'fuga' }, 'test2.id AS 2_id' ] ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};
exports['test_parse_where'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE a = FALSE AND b = $1', values: [] },
                      sqlg.select('test', '*', 'a = FALSE AND b = $1' ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE a = $1 AND b = $2 AND flag = $3', values: [ 1, 'str', false ] },
                      sqlg.select('test','*', { a: 1, b: 'str', flag: false } ) );
    
    sqlg.select('test','*', { a: 1, b: 'str', flag: false }, {}, function( sql, values ) {
        assert.deepEqual( { sql: 'SELECT * FROM test WHERE a = $1 AND b = $2 AND flag = $3', values: [ 1, 'str', false ] },
                          { sql: sql, values: values } );
    } );
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE foo = $1 OR bar = $2 OR buz = $3', values: [ 1, 2, 3 ] },
                      sqlg.select('test','*', [ { foo: 1 }, { bar: 2 }, { buz: 3 } ] ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE ( foo = $1 OR foo = $2 OR foo = $3 )', values: [ 1, 2, 3 ] },
                      sqlg.select('test','*', { foo: [ 1, 2, 3 ] } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE foo IS NULL', values: [] },
                      sqlg.select('test','*', { foo: null } ) );

    assert.deepEqual( { sql: 'SELECT * FROM test WHERE ( foo != $1 OR foo != $2 OR foo != $3 ) AND foo == NULL', values: [ 1, 2, 3 ] },
                      sqlg.select( 'test','*', { foo: { '!=': [ 1, 2, 3 ], '==': null } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE ( foo = $1 OR foo != $2 )', values: [ 1, 2 ] },
                      sqlg.select('test','*', { foo: [ 1, { '!=': 2 } ] } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE (foo = $1 AND foo != $2)', values: [ 1, 2 ] },
                      sqlg.select('test','*', { foo: { '-and': [ 1, { '!=': 2 } ] } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE (foo = $1 OR bar = $2 OR buz != $3)', values: [ 1, 2, 3 ] },
                      sqlg.select('test', '*', { '-or': { foo: 1, bar: 2, buz: { '!=': 3 } } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE foo IN ( $1, $2, $3 )', values: [ 1, 2, 3 ] },
                      sqlg.select('test','*', { foo: { in: [ 1, 2, 3 ] } } ) );

    assert.deepEqual( { sql: 'SELECT * FROM test WHERE foo NOT IN ( $1, $2, $3 )', values: [ 1, 2, 3 ] },
                      sqlg.select('test','*', { foo: { "not in": [ 1, 2, 3 ] } } ) );

    assert.deepEqual( { sql: 'SELECT * FROM test WHERE foo = $1 AND sample_id IN ( SELECT id FROM sample WHERE name = $2 )', values: [ 1, 'hoge' ] },
                      sqlg.select('test','*', { foo: 1, sample_id: { in: { sql: { sql: 'SELECT id FROM sample WHERE name = $1', values: [ 'hoge' ] } } } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE sample_id IN ( SELECT id FROM sample WHERE disable=FALSE ) ', values: [] },
                      sqlg.select('test','*', { sample_id: { in: 'SELECT id FROM sample WHERE disable=FALSE' } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE $1 = ANY(ary)', values: [ 'hoge' ] },
                      sqlg.select('test','*', { ary: { ARRAY: 'hoge' } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE ($1 = ANY(ary_num) OR $2 = ANY(ary_num) OR $3 = ANY(ary_num))', values: [ 1, 2, 3 ] },
                      sqlg.select('test','*', { ary_num: { ARRAY: [ 1, 2, 3] } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE $1 = ANY(ary_num)', values: [ 1 ] },
                      sqlg.select('test','*', { ary_num: { ARRAY: { ANY: 1 } } } ) );

    assert.deepEqual( { sql: 'SELECT * FROM test WHERE $1 != ALL(ary_num)', values: [ 1 ] },
                      sqlg.select('test','*', { ary_num: { ARRAY: { '!= ALL': 1 } } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE (SELECT id FROM sample WHERE disable = $1) = ANY(ary_sample_id)', values: [ false ] },
                      sqlg.select('test','*', { ary_sample_id: { ARRAY: { sql: { sql: 'SELECT id FROM sample WHERE disable = $1', values: [ false ] } } } } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test WHERE (SELECT id FROM sample WHERE disable = FALSE) = ANY(ary_sample_id)', values: [] },
                      sqlg.select('test','*', { ary_sample_id: { ARRAY: 'SELECT id FROM sample WHERE disable = FALSE' } } ) );

    if( typeof test.finish == 'function' ) test.finish();
};

exports['test_parse_options'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    
    assert.deepEqual( { sql: 'SELECT * FROM test GROUP BY foo', values: [] },
                      sqlg.select('test','*', null, { group_by: 'foo'} ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test GROUP BY foo, bar', values: [] },
                      sqlg.select('test','*', null, { group_by: [ 'foo', 'bar' ] } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test ORDER BY foo', values: [] },
                      sqlg.select('test','*', null, { order: 'foo' } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test ORDER BY foo, bar', values: [] },
                      sqlg.select('test','*', null, { order: [ 'foo', 'bar' ] } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test LIMIT 100', values: [] },
                      sqlg.select('test','*', null, { limit: 100 } ) );
    
    assert.deepEqual( { sql: 'SELECT * FROM test OFFSET 100', values: [] },
                      sqlg.select('test','*', null, { offset: 100 } ) );
    assert.deepEqual( { sql: 'SELECT * FROM test GROUP BY foo ORDER BY bar LIMIT 10 OFFSET 100', values: [] },
                      sqlg.select('test','*', null, { group_by: 'foo', order: 'bar', limit: 10, offset: 100 } ) );
    
    if( typeof test.finish == 'function' ) test.finish();
};

exports.test_join = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }
    
    assert.deepEqual( { sql: 'SELECT * FROM T1 INNER JOIN T2 ON T1.this = T2.that INNER JOIN T3 ON T2.some = T3.other AND T2.i != T3.d', values: [] },
                     sqlg.select(["T1",{ "INNER_JOIN": { "T1.this" : "T2.that" } }, "T2", { "INNER_JOIN": { "T2.some": "T3.other", "T2.i": {"!=": "T3.d"}}}, "T3"],
                                 '*'));
    
    if( typeof test.finish == 'function' ) test.finish();
}
