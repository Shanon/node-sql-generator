/*jshint laxbreak: true, loopfunc: true, node: true*/
//var sys = require('sys');
var SqlGenerator = function( type ) {
    var self = this;
    if( !type )
        type = 'Pg';

    var placeHolder = function(n){return '$' + n};
    if(type == "mysql"){
        placeHolder = function(){return '?'};
    }

    self.driver_type = type;
    //console.log( sys.inspect( [ self ] ) );
    //self.driver = require('./driver/' + self.driver_type );
    
    self.select = function( tbls, columns, wheres, opt, callback ) {
//        console.log( sys.inspect( {table: table, columns: columns, where:wheres, opt:opt} ) );
        var table  = self._gen_table( tbls );
        var column = self._gen_select_column( columns );
        var values = [];
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
        var sqls = [];
        // these code is postgresql only
        if( opt.group_by ) {
            if( typeof opt.group_by === 'object' && opt.group_by instanceof Array )
                sqls.push( 'GROUP BY ' + opt.group_by.join(', ') );
            else
                sqls.push( 'GROUP BY ' + opt.group_by );
        }
        if( opt.order ) {
            var order = '';
            if( opt.order instanceof Array )
                order = opt.order.join(', ');
            else
                order = opt.order;
            sqls.push( 'ORDER BY ' + order );
        }
        if( opt.limit && typeof opt.limit === 'number' )
            sqls.push( 'LIMIT ' + opt.limit );
        if( opt.offset && typeof opt.offset === 'number' )
            sqls.push( 'OFFSET ' + opt.offset );
        return sqls.join(' ');
    };
    self._gen_where = function( tmp_where, values ) {
        var w, ws;
        if( tmp_where ) {
            var where = JSON.parse( JSON.stringify( tmp_where ) );
            if( where instanceof Array ) {
                ws = [];
                for( var i = 0; i < where.length; i ++ ) {
                    ws.push( self._recurse_where( values, where[i] ) );
                }
                w = ws.join(' OR ');
            }
            else if( typeof where == 'object' ) {
                ws = [];
                for( var key in where )
                    ws.push( self._recurse_where( values, where[key], key ) );
                w = ws.join(' AND ');
            }
            else
                w = where;
        }
        return w;
    };
    self._recurse_where = function( values, where, key, bop, jk ) {
        if( !bop )
            bop = '=';
        if( !jk )
            jk = 'AND';
        var vs = [], i, sql, tmp_values, new_sql;
        //var util = require('util');
        //console.log( util.inspect( { values: values, where: where, key: key, bop: bop, jk: jk }, false, 10 ) );
        if( key && key.toLowerCase() == '-or' ) {
            vs = [];
            if( where instanceof Array )
                where.forEach( function( w ) {
                    vs.push( self._recurse_where( values, w, key, bop, 'OR' ) );
                } );
            else if( typeof where == 'object' )
                Object.keys( where ).forEach( function( w ) {
                    var tmph = {};
                    tmph[ w ] = where[ w ];
                    vs.push( self._recurse_where( values, tmph, null, bop, 'OR' ) );
                } );
            return '(' + vs.join(' OR ') + ')';
        }
        else if( where instanceof Array ) {
            for( i = 0; i < where.length; i ++ )
                vs.push( self._recurse_where( values, where[i], key, bop, jk ) );
            return '( ' + vs.join(' OR ') + ' )';
        }
        else if( ( where === null || where === undefined ) && key ) {
            if(  bop == '=' )
                return key + ' IS NULL';
            else
                return key + ' ' + bop + ' NULL';
        }
        else if( typeof where == 'object' ) {
            var ws = [];
            for( var op in where ) {
                //console.log( '+++', { ws: ws, op: op, key:key, 'where[op]': where[op] } );
                if( op.toLowerCase() == '-and' ) {
                    vs = [];
                    where[op].forEach( function( w ) {
                        vs.push( self._recurse_where( values, w, key, bop, jk ) );
                    } );
                    return '(' + vs.join(' AND ') + ')';
                }
                else if( ['=','!=','>','>=','<','<='].indexOf( op.toLowerCase() ) != -1 ) {
                    ws.push( self._recurse_where( values, where[op], key, op, jk ) );
                }
                else if( op.toLowerCase() == 'in' ) {
                    if( typeof where[op] == 'object'
                        && typeof where[op].sql === 'object'
                        && where[op].sql.sql && where[op].sql.values ) {
                        sql = where[op].sql.sql;
                        tmp_values = [];
                        for( i = where[op].sql.values.length - 1; i >= 0; i -- ) {
                            tmp_values.unshift( where[op].sql.values[i] );
                            new_sql = sql.replace( '\$' + ( i + 1 ), placeHolder( values.length + i + 1 ) );
                            sql = new_sql;
                        }
                        for( i = 0; i < tmp_values.length; i ++ )
                            values.push( tmp_values[i] );
                        ws.push( key + ' IN ( ' + sql + ' )' );
                    }
                    else if( typeof where[op] == 'string' && where[op].match('^(SELECT|select)') )
                        ws.push( key + ' IN ( ' + where[op] + ' ) ' );
                    else {
                        for( i = 0; i < where[op].length; i ++ ) {
                            values.push( where[op][i] );
                            vs.push( placeHolder(values.length) );
                        }
                        ws.push( key + ' IN ( ' + vs.join(', ') + ' )');
                    }
                }
                else if( op.toLowerCase() == 'array' ) {
                    if( typeof where[op] != 'object' ) {
                        where[op] = { ANY: where[op] };
                    }
                    var ary_fn;
                    var ary_op;
                    var sec;
                    ( function() {
                        var flag = false;
                        if( typeof where[op] == 'object' )
                            for( var ary_key in where[op] )
                                if( ary_key.toLowerCase().match( /(any|all)$/ ) ) {
                                    ary_fn = RegExp.$1.toUpperCase();
                                    if( ary_key.match( /^(!=|>=|<=|>|<|=) / ) )
                                        ary_op = RegExp.$1;
                                    else
                                        ary_op = '=';
                                    sec = where[op][ary_key];
                                    flag = true;
                                    break;
                                }
                        if( !flag ) {
                            ary_fn = 'ANY';
                            ary_op = '=';
                            sec = where[op];
                        }
                    } )();
                    if( typeof sec.sql === 'object'
                        && sec.sql.sql && sec.sql.values ) {
                        sql = sec.sql.sql;
                        tmp_values = [];
                        for( i = sec.sql.values.length - 1; i >= 0; i -- ) {
                            tmp_values.unshift( sec.sql.values[i] );
                            new_sql = sql.replace( '\$' + ( i + 1 ), placeHolder( values.length + i + 1 ) );
                            sql = new_sql;
                        }
                        for( i = 0; i < tmp_values.length; i ++ )
                            values.push( tmp_values[i] );
                        ws.push( '(' + sql + ') ' + ary_op + ' ' + ary_fn + '(' + key + ')' );
                    }
                    else if( typeof sec == 'string' && sec.match('^(SELECT|select)') )
                        ws.push( '(' + sec + ') ' + ary_op + ' ' + ary_fn + '(' + key + ')' );
                    else if( sec instanceof Array ) {
                        vs = [];
                        sec.forEach( function( v ) {
                            values.push( v );
                            vs.push( placeHolder(values.length) + ' ' + ary_op + ' ' + ary_fn + '(' + key + ')' );
                        } );
                        ws.push( '(' + vs.join(' OR ') + ')' );
                    }
                    else {
                        values.push( sec );
                        ws.push( placeHolder(values.length) + ' ' + ary_op + ' ' + ary_fn + '(' + key + ')' );
                    }
                }
                else if( key ) {
                    if( where[op] instanceof Array )
                        ws.push( self._recurse_where( values, where[op], key, op, jk ) );
                    else
                        ws.push( self._recurse_where( values, where[op], key, op, jk ) );
                }
                else {
                    ws.push( self._recurse_where( values, where[op], op, bop, jk ) );
                }
            }
            return ws.join(' '+jk+' ');
        }
        else {
            values.push( where );
            return key + ' ' + bop + ' ' + placeHolder(values.length);
        }
    };
    self._gen_on = function(on_clause) {
        var values = [];
        var sql = self._gen_where(on_clause, values);

        if(type == "Pg"){
            return "ON " + sql.replace(/\$(\d+)/g, function(x, y) { 
                y = (y*1) - 1; return values[y]; 
            });
        }
        if(type == "mysql"){
            var i = 0;
            return "ON " + sql.replace(/\?/g, function(x) { 
                i++; return values[i - 1]; 
            });
        }
    };
    self._gen_select_column = function( columns ) {
        var column = '';
        var cols, key;
        if( columns instanceof Array ) {
            cols = [];
            for( var i = 0; i < columns.length; i ++ ) {
                if( typeof columns[i] == 'object' ) {
                    for( key in columns[i] )
                        cols.push( key + ' AS ' + columns[i][key] );
                }
                else
                    cols.push( columns[i] );
            }
            column = cols.join(', ');
        }
        else if( typeof columns == 'object' ) {
            cols = [];
            for( key in columns )
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
        var t = [], join_with = ', ', on_clause = '';
        if( table instanceof Array ) {
            for( var i = 0; i < table.length; i ++ ) {
                if( typeof table[i] === 'object' ) {
                    for( var k in table[i] ) {
                        if(k.match(/_JOIN$/)) {
                            t.push(k.replace("_"," "));
                            on_clause = self._gen_on(table[i][k]);
                            join_with = " ";
                        } else {
                            t.push( k + ' AS ' + table[i][k] );
                        }
                    }
                } else {
                    t.push( table[i] );
                    if(on_clause) {
                        t.push(on_clause);
                        on_clause = '';
                    }
                }
            }
            return t.join(join_with);
        }
        return table;
    };
    self.insert = function( table, data, callback ) {
//        console.log( sys.inspect( {table: table, data: data } ) );
        var keys = [];
        var values = [];
        var pvalues = [];
        for( var key in data ) {
            keys.push( key );
            if( typeof data[key] == 'object' && data[key] instanceof Array ) {
                var is_num = true;
                for( var i = 0; i < data[key].length; i ++ ) {
                    if( typeof data[key][i] != 'number' ) {
                        is_num = false;
                        break;
                    }
                }
                if( is_num ) {
                    values.push( "{" + data[key].join(',') + "}" );
                    pvalues.push( placeHolder(values.length) );
                }
                else {
                    var ary_vs = [];
                    data[key].forEach( function( v ) {
                        values.push( v );
                        ary_vs.push( placeHolder(values.length) );
                    } );
                    pvalues.push( 'ARRAY[' + ary_vs.join(', ') + ']' );
                }
            }else if( typeof data[key] == 'object' && data[key]["function"]){
                var valueLength = values.length ;
                (data[key]["args"] || []).forEach(function(value){values.push( value )});

                var callFunction = 
                        data[key]["function"] + "("
                        + (data[key]["args"] || []).map(function(value){return placeHolder(++valueLength)}).join(",") 
                        + ")";
                pvalues.push( callFunction );
            }else {
                values.push( data[key] );
                pvalues.push( placeHolder(values.length) );
            }
        }
        var sql = 'INSERT INTO ' + table + ' ( ' + keys.join(', ') + ' ) VALUES ( ' + pvalues.join(', ') + ' )';
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
    self.update = function( table, wheres, data, callback ) {
        //console.log( sys.inspect( { table: table, where: wheres, data: data } ) );
        var kvs = [];
        var values = [];
        for( var key in data ) {
            if( typeof data[key] == 'object' && data[key] instanceof Array ) {
                var is_num = true;
                for( var i = 0; i < data[key].length; i ++ ) {
                    if( typeof data[key][i] != 'number' ) {
                        is_num = false;
                        break;
                    }
                }
                if( is_num ) {
                    values.push( "{" + data[key].join(',') + "}" );
                    kvs.push( key + ' = ' + placeHolder(values.length) );
                }
                else {
                    var ary_vs = [];
                    data[key].forEach( function( v ) {
                        values.push( v );
                        ary_vs.push( placeHolder(values.length) );
                    } );
                    kvs.push( key + ' = ARRAY[' + ary_vs.join(', ') + ']' );
                }
            }
            else {
                values.push( data[key] );
                kvs.push( key + ' = ' + placeHolder(values.length) );
            }
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
        var values = [];
        var where = self._gen_where( wheres, values );
        var sql = 'DELETE FROM ' + table;
        if( where && where.length > 0 )
            sql += ' WHERE ' + where;
        if( typeof callback == 'function' )
            return callback( sql, values );
        return { sql: sql, values: values };
    };
};
module.exports = SqlGenerator;
