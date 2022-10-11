var arr = '3,0,1,2,4'.split(',');
var x = 0;
var cnt = 0;
while (true) {
  switch (arr[cnt++]) {
    case '0':
      console.log('case 0');
      x += 5;
      continue;
    case '1':
      console.log('case 1');
      x += 4;
      continue;
    case '2':
      console.log('case 2');
      x += 3;
      continue;
    case '3':
      console.log('case 3');
      x += 2;
      continue;
    case '4':
      console.log('case 4');
      x += 1;
      continue;

  }
  break;
}
