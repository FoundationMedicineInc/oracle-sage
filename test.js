const oracledb = require('oracledb');

const query = `
  INSERT ALL
  INTO USERS (username) values ('c')
  INTO USERS (username) values ('d')
  SELECT * FROM dual
`;
oracledb.getConnection(
  {
    user: 'SAGE_TEST',
    password: 'oracle',
    connectString: 'localhost:1521/xe',
  },
  (err, connection) => {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      query,
      [], // bind value for :id
      { autoCommit: true },
      (err, result) => {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result);
        doRelease(connection);
      },
    );
  },
);

function doRelease(connection) {
  connection.close((err) => {
    if (err) console.error(err.message);
  });
}
