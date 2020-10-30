var aesjs = require('aes-js');

var getEncryptedKey = async (address) => {


    var key = JSON.parse(process.env.SECRET_KEY)
    var iv = JSON.parse(process.env.SECRET_IV)

    var textBytes = aesjs.utils.utf8.toBytes(address);
    var aesOfb = new aesjs.ModeOfOperation.ofb(key, iv);
    var encryptedBytes = aesOfb.encrypt(textBytes);

    // To print or store the binary data, you may convert it to hex
    var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

    return encryptedHex;
}

module.exports = {
    getEncryptedKey
}