var fetch = require('node-fetch');
var Web3 = require('web3');
var abi = require('./abi.json');
var encodeCredentials = require("./encode-auth");
var decrytpKeyHelper = require("./get-decrypt-private-key");

var addressData = async () => {

  try {
    var web3 = new Web3(process.env.INFURA_URL);
    var gasPricewei = await web3.eth.getGasPrice();
    var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(), 'gwei');
    var _gasLimit = 36999;
    var address = '';
    var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
    var contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
    var encryptedHex = await decrytpKeyHelper.decryptPrivateKey(process.env.PRIVATE_KEY_ETH);
    var decryptedText = web3.eth.accounts.privateKeyToAccount(encryptedHex);
    console.log("decryptedText", decryptedText)
    var nonce = await web3.eth.getTransactionCount(decryptedText.address);

    console.log(nonce)
    var tx = {
      nonce: "0x" + nonce.toString(16),
      from: decryptedText.address,
      to: process.env.CONTRACT_ADDRESS,
      gasPrice: web3
        .utils
        .toHex(_gasPriceGwei * 1e9),
      gasLimit: web3
        .utils
        .toHex(_gasLimit),
      chainId: 1,
      data: contract
        .methods
        .getnewaddress()
        .encodeABI()
    };

    console.log("tx", tx)

    var tx = await decryptedText.signTransaction(tx);
    await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function (a, b) {
      console.log("Topic", a);
      console.log("b", b)
      address = ('0x' + a.logs[0].data.slice(26)).toString();
    })
    console.log(address);
    return address;
  } catch (error) {
    console.log("Address Generation error :: ", error);
  }
}

module.exports = {
  addressData
}