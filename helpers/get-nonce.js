var Web3 = require('web3');
var decrytpKeyHelper = require("./get-decrypt-private-key");
var nonce = 0;
var getNonce = async () => {
	var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
    var encryptedHex = await decrytpKeyHelper.decryptPrivateKey(process.env.PRIVATE_KEY_ETH);
    var decryptedText = web3.eth.accounts.privateKeyToAccount(encryptedHex);
    var _nonce = await web3.eth.getTransactionCount(decryptedText.address, "pending");
    if(_nonce > nonce){
    	nonce = _nonce;
    	return _nonce
    }else{
    	return ++nonce;
    }
}

module.exports = {
	getNonce
}