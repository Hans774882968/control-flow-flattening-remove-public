function enc (v1) {
  var i = 0;
  i += -1;
  var out = '';
  i += 1;
  for (; i < v1.length; ++i) {
    var v2 = 0;
    if (i & 1) v2 = 51;else v2 = 49;
    out += String.fromCharCode(v1[i].charCodeAt() ^ v2);
  }
  return out;
}
if (enc('flag{hans}') === 'W_PTJ[P]BN') console.log('pass');else console.log('try again');
