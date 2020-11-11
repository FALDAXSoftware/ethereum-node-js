var aesjs = require('aes-js');

var decryptPrivateKey = async (address) => {

    var key = JSON.parse(process.env.SECRET_KEY)
    var iv = JSON.parse(process.env.SECRET_IV)
    console.log("key", key);
    console.log("address", address)

    // When ready to decrypt the hex string, convert it back to bytes
    var encryptedBytes = aesjs.utils.hex.toBytes(address);
    // The output feedback mode of operation maintains internal state,
    // so to decrypt a new instance must be instantiated.
    var aesOfb = new aesjs.ModeOfOperation.ofb(key, iv);
    var decryptedBytes = aesOfb.decrypt(encryptedBytes);

    // Convert our bytes back into text
    var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);

    console.log("decryptedText", decryptedText)

    return decryptedText;
}

module.exports = {
    decryptPrivateKey
}