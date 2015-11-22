var _ = require('lodash'),
	servConstr = require('../lib/service/bleServConstr');

var charsInfo = [
	{uuid: '0xFFF1', prop: 2, desc: 'CHAR1', name: 'CHAR1', val: 20},
	{uuid: '0xFFF2', prop: 8, desc: 'CHAR2', name: 'CHAR2', val: 40},
	{uuid: '0xFFF3', prop: 10, desc: 'CHAR3', name: 'CHAR3', val: 60},
	{uuid: '0xFFF4', prop: 2, name: 'CHAR4', val: 80},
	{uuid: '0xFFF5', prop: 2, name: 'CHAR5', val: 100},
];

var service = new servConstr('centralServ', '0xFFF0', charsInfo);
console.log(service);
var attrs = service.getAttrs();
console.log(attrs);
_.sortByAll(attrs, ['prop']);
console.log(_.sortByAll(attrs, ['prop']));
// console.log(attrs);
