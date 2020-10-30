var request = require('request');
var Web3 = require('web3');
var abi = require('./abi.json');

var getFee = async () => {
    var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
    var gasPrice = await web3.eth.getGasPrice();
    console.log(gasPrice);
    var fees = gasPrice * 86000;
    console.log(fees);
    return web3.utils.fromWei(fees.toString(), 'ether');
}

module.exports = {
    getFee
}