//var sys = require('sys');
var SqlGenerator = function( type ) {
    var self = this;
    if( !type )
        type = 'Pg';
    self.driver_type = type;
    //console.log( sys.inspect( [ self ] ) );
    //self.driver = require('./driver/' + self.driver_type );
    
    self.select = function( tbls, columns, wheres, opt, callback ) {
//        console.log( sys.inspect( {table: table, columns: columns, where:wheres, opt:opt} ) );
        var table  = self._gen_table( tbls );
        var column = self._gen_select_column( columns );
        var values = new Array;
        var where  = self._gen_where( wheres, values );
        var option = self._gen_select_option( opt );
//        console.log( sys.inspect( { table: table, column: column, where: where, option: option } ) );
        var sql = 'SELECT ' + column + ' FROM ' + table;
        if( where && where.length > 0 )
            sql += ' WHERE ' + where;
        if( option && option.length > 0 )
            sql += ' ' + option;
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
    self._gen_select_option = function( opt ) {
        if( !( typeof opt == 'object' && !(opt instanceof Array) ) )
            return '';
        var sqls = new Array;
        // these code is postgresql only
        if( opt['group_by'] ) {
            if( typeof opt['group_by'] == 'object' && opt['group_by'] instanceof Array )
                sqls.push( 'GROUP BY ' + opt['group_by'].join(', ') );
            else
                sqls.push( 'GROUP BY ' + opt['group_by'] );
        }
        if( opt['order'] ) {
            var order = '';
            if( opt['order'] instanceof Array )
                order = opt['order'].join(', ');
            else
                order = opt['order'];
            sqls.push( 'ORDER BY ' + order );
        }
        if( opt['limit'] && typeof opt['limit'] == 'number' )
            sqls.push( 'LIMIT ' + opt['limit'] );
        if( opt['offset'] && typeof opt['offset'] == 'number' )
            sqls.push( 'OFFSET ' + opt['offset'] );
        return sqls.join(' ');
    };
    self._gen_where = function( where, values ) {
        var w;
        if( where ) {
            if( where instanceof Array ) {
                var ws = new Array;
                for( var i = 0; i < where.length; i ++ ) {
                    ws.push( self._recurse_where( values, where[i] ) );
                }
                w = ws.join(' OR ');
            }
            else if( typeof where == 'object' ) {
                var ws = new Array;
                for( var key in where )
                    ws.push( self._recurse_where( values, where[key], key ) );
                w = ws.join(' AND ');
            }
            else
                w = where;
        }
        return w;
    };
    self._recurse_where = function( values, where, key ) {
        if( where instanceof Array ) {
            var vs = new Array;
            for( var i = 0; i < where.length; i ++ )
                vs.push( self._recurse_where( values, where[i], key ) );
            return '( ' + vs.join(' OR ') + ' )';
        }
        else if( typeof where == 'object' ) {
            var ws = new Array;
            for( var op in where ) {
                if( op.toLowerCase() == 'in' ) {
                    if( typeof where[op] == 'object'
                        && typeof where[op]['sql'] == 'object'
                        && where[op]['sql']['sql'] && where[op]['sql']['values'] ) {
                        var sql = where[op]['sql']['sql'];
                        var tmp_values = new Array();
                        for( var i = where[op]['sql']['values'].length - 1; i >= 0; i -- ) {
                            tmp_values.unshift( where[op]['sql']['values'][i] );
                            var new_sql = sql.replace( '\$' + ( i + 1 ), '$' + ( values.length + i + 1 ) );
                            sql = new_sql;
                        }
                        for( var i = 0; i < tmp_values.length; i ++ )
                            values.push( tmp_values[i] );
                        ws.push( key + ' IN ( ' + sql + ' )' );
                    }
                    else if( typeof where[op] == 'string' && where[op].match('^SELECT') )
                        ws.push( key + ' IN ( ' + where[op] + ' ) ' );
                    else {
                        var vs = new Array();
                        for( var i = 0; i < where[op].length; i ++ ) {
                            values.push( where[op][i] );
                            vs.push( '$' + values.length );
                        }
                        ws.push( key + ' IN ( ' + vs.join(', ') + ' )');
                    }
                }
                else if( key ) {
                    values.push( where[op] );
                    ws.push( key + ' ' + op.toUpperCase() + ' $' + values.length );
                }
                else {
                    ws.push( self._recurse_where( values, where[op], op ) );
                }
            }
            return ws.join(' AND ');
        }
        else {
            values.push( where );
            return key + ' = $' + values.length;
        }
    };
    self._gen_select_column = function( columns ) {
        var column = '';
        if( columns instanceof Array ) {
            var cols = new Array;
            for( var i = 0; i < columns.length; i ++ ) {
                if( typeof columns[i] == 'object' ) {
                    for( var key in columns[i] )
                        cols.push( key + ' AS ' + columns[i][key] );
                }
                else
                    cols.push( columns[i] );
            }
            column = cols.join(', ');
        }
        else if( typeof columns == 'object' ) {
            var cols = new Array;
            for( var key in columns )
                cols.push( key + ' AS ' + columns[key] );
            column = cols.join(', ');
        }
        else {
            column = columns;
        }
        if( typeof column == 'undefined' || column.length < 1 )
            column = '*';
        return column;
    };
    self._gen_table = function( table ) {
        var t = new Array;
        if( table instanceof Array ) {
            for( var i = 0; i < table.length; i ++ ) {
                if( typeof table[i] == 'object' )
                    for( var k in table[i] )
                        t.push( k + ' AS ' + table[i][k] );
                else
                    t.push( table[i] );
            }
            return t.join(', ');
        }
        return table;
    };
    self.insert = function( table, data, callback ) {
//        console.log( sys.inspect( {table: table, data: data } ) );
        var keys = new Array;
        var values = new Array;
        var pvalues = new Array;
        for( var key in data ) {
            keys.push( key );
            values.push( data[key] );
            pvalues.push( '$' + values.length );
        }
        var sql = 'INSERT INTO ' + table + ' ( ' + keys.join(', ') + ' ) VALUES ( ' + pvalues.join(', ') + ' )';
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
    self.update = function( table, wheres, data, callback ) {
        //console.log( sys.inspect( { table: table, where: wheres, data: data } ) );
        var kvs = new Array;
        var values = new Array;
        for( var key in data ) {
            values.push( data[key] );
            kvs.push( key + ' = $' + values.length );
        }
        var where = self._gen_where( wheres, values );
        var sql = 'UPDATE ' + table + ' SET ' + kvs.join(', ');
        if( where && where.length > 0 )
            sql += ' WHERE ' + where;
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
    self.delete = function( table, wheres, callback ) {
        //console.log( sys.inspect( { table: table, where: wheres } ) );
        var values = new Array;
        var where = self._gen_where( wheres, values );
        var sql = 'DELETE FROM ' + table;
        if( where && where.length > 0 )
            sql += ' WHERE ' + where;
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
}
module.exports = SqlGenerator;