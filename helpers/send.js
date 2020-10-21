var fetch = require('node-fetch')
var Web3 = require('web3');
var abi = require('./abi.json');
var ERC20abi = require('./ERC20abi.json');

var sendData = async (sendInfo) => {
    
    try {
        var returndata = '';
        var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
        var decryptedText = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY_ETH);
        var gasPricewei = await web3.eth.getGasPrice();
        if(sendInfo.coin == "ETH"){
            var contract = new web3.eth.Contract(abi,process.env.CONTRACT_ADDRESS);
            var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(),'gwei');
            var _gasLimit = 36999;
            var address = sendInfo.address;
            var amount = web3.utils.toWei(sendInfo.amount.toString(),'ether');
            console.log(contract);
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
              chainId: 42,
              data: contract
                .methods
                .transferfromadmin(address,amount)
                .encodeABI()
            };
            console.log(tx);
            var tx = await decryptedText.signTransaction(tx);
            await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function(a,b){
                console.log("Topic",a);
                returndata = a;
            })
            return returndata;
        }else if(sendInfo.coin=="QRXD"){
            var contract = new web3.eth.Contract(abi,process.env.CONTRACT_ADDRESS);
            var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(),'gwei');
            var _gasLimit = 80000;
            var address = sendInfo.address;
            var amount = web3.utils.toWei(sendInfo.amount.toString(),'ether');
            console.log(contract);
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
              chainId: 42,
              data: contract
                .methods
                .transferToken(process.env.ERC20_1,address,amount)
                .encodeABI()
            };
            console.log(tx);
            var tx = await decryptedText.signTransaction(tx);
            await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function(a,b){
                console.log("Topic",a);
                returndata = a;
            })
            return returndata;
        }else if(sendInfo.coin=="DOX"){
            var contract = new web3.eth.Contract(abi,process.env.CONTRACT_ADDRESS);
            var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(),'gwei');
            var _gasLimit = 80000;
            var address = sendInfo.address;
            var amount = web3.utils.toWei(sendInfo.amount.toString(),'ether');
            console.log(contract);
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
              chainId: 42,
              data: contract
                .methods
                .transferToken(process.env.ERC20_2,address,amount)
                .encodeABI()
            };
            console.log(tx);
            var tx = await decryptedText.signTransaction(tx);
            await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function(a,b){
                console.log("Topic",a);
                returndata = a;
            })
            return returndata;
        }
    } catch (error) {
        console.log("Send fund error :: ", error);
    }
}

module.exports = {
    sendData
}