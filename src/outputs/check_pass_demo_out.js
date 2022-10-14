function check_pass (password) {
  var i = 0,
    sum = 0;
  for (i = 0;; i++) {
    if (i == password.length) break;
    sum = sum + password.charCodeAt(i);
  }
  if (i == 4) {
    if (sum == 417 && password.charAt(3) > 'c' && password.charAt(3) < 'e' && password.charAt(0) == 'b') {
      if ((password.charCodeAt(3) ^ 13) == password.charCodeAt(1)) return 1;
      console.log('Orz..');
    }
  } else console.log('len error');
  return 0;
}
function test () {
  check_pass('bird') ? alert('congratulation!') : alert('error!');
}
test();
