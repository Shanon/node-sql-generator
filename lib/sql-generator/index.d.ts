declare class SqlGenerator {
  constructor(dbmsType : string);
  select( table : string , columns , wheres? , opt?, callback? )
  insert( table : string , data    , callback? ) 
  update( table : string , wheres  , data , callback? ) 
  delete( table : string , wheres  , callback? ) 
}
export = SqlGenerator;
