const csv = require('csv/sync');

let data = [
    ["asdasd", 'as\nasd\nsa', "rrr"]
]
let s = csv.stringify(data);
console.log(s);

let str = `2, "5555
6666
777",哈哈哈
`

const rawRecords = csv.parse(str);
let data2 = csv.transform(rawRecords, function(d){
    return d;
});
console.log(data2)