function extractFirstJson(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let count = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') count++;
    if (str[i] === '}') count--;
    if (count === 0) return str.substring(start, i + 1);
  }
  return null;
}
console.log(extractFirstJson('{ "a": 1 } { "b": 2 }'));
