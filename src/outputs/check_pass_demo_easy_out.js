function check_pass (password) {
  var v1 = {
    'tPlEX': function (v2, v3) {
      return v2 == v3;
    },
    'TcjYB': function (v4, v5) {
      return v4 + v5;
    },
    'ZtFYf': function (v6, v7) {
      return v6 == v7;
    },
    'tPstu': function (v8, v9) {
      return v8 > v9;
    },
    'Vhxzy': function (v10, v11) {
      return v10 < v11;
    },
    'uuFIS': function (v12, v13) {
      return v12 == v13;
    },
    'cRvgS': function (v14, v15) {
      return v14 ^ v15;
    },
    'GsTse': 'Orz..',
    'ykyBq': 'len error'
  };
  var i = 0;
  var sum = 0;
  for (i = 0;; i++) {
    if (i == password.length) {
      break;
    }
    sum = sum + password.charCodeAt(i);
  }
  if (i == 4) {
    if (sum == 417 && password.charAt(3) > 'c' && password.charAt(3) < 'e' && password.charAt(0) == 'b') {
      if ((password.charCodeAt(3) ^ 13) == password.charCodeAt(1)) {
        return 1;
      }
      console.log('Orz..');
    }
  } else {
    console.log('len error');
  }
  return 0;
}
function test () {
  var v16 = {
    'eOZRR': function (v17, v18) {
      return v17(v18);
    },
    'alzHn': 'bird',
    'GyIol': function (v19, v20) {
      return v19(v20);
    },
    'FWSbx': 'congratulation!',
    'tYizA': 'error!'
  };
  if (check_pass('bird')) {
    alert('congratulation!');
  } else {
    alert('error!');
  }
}
test();
