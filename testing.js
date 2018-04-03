const buffer = Buffer.from([
  0x68,
  0x70,
  0x7b,
  0xc7,
  0x20,
  0xc2,
  0x57,
  0x24,
  0xe0,
  0x53,
  0x01,
  0x00,
  0x00,
  0x7f,
  0xeb,
  0xd4,
]);
console.log(buffer.toString('utf8'));
// todo: maybe we should select using the HEX function
// todo: maybe also a template to allow you to control how a field is selected with a function e.g.:
// fieldName => `HEX(${fieldName})`
// add a note about this in best practices documentation
// should also add a note about using transactions generally
