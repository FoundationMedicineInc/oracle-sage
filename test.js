var oracledb = require('oracledb');
var query = `
  INSERT ALL
  INTO USERS (username) values ('c')
  INTO USERS (username) values ('d')
  SELECT * FROM dual
`
oracledb.getConnection(
  {
    user          : "SAGE_TEST",
    password      : "oracle",
    connectString : "localhost:1521/xe"
  },
  function(err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      query,
      [],  // bind value for :id
      { autoCommit: true },
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result);
        doRelease(connection);
      });
  });

function doRelease(connection)
{
  connection.close(
    function(err) {
      if (err)
        console.error(err.message);
    });
}
