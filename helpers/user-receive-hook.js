var Web3 = require('web3');
const Dagger = require('@maticnetwork/dagger');
var abi = require('./abi.json');
var ERC20abi = require('./ERC20abi.json');
var forwarder = require('./forwarder.json')
var userrecive = async (addressinfo) => {
	var dagger = new Dagger('wss://kovan.dagger.matic.network');
	var web3 = new Web3('wss://kovan.infura.io/ws/v3/b0814c44f1de43a1b2024f2c08f0eddc');
	//tokens ERC20_1
	var web3Contract_ERC20_1 = new web3.eth.Contract(ERC20abi,process.env.ERC20_1);
	var contract_1 = dagger.contract(web3Contract_ERC20_1);
	var filter = contract_1.events.Transfer({filter: {to: addressinfo.address}, room: 'latest'});
	console.log(filter);
	// watch
	filter.watch(async function(data, removed){
		console.log('QRXD Recived');
		var a = await web3.eth.getTransaction(data.transactionHash);
	    console.log(a);
	    //TODO DB
	    
	    var decryptedText = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY_ETH);
	    var contract = new web3.eth.Contract(forwarder,data.returnValues[1]);
	    var nonce = await web3.eth.getTransactionCount(decryptedText.address);
	    var gasPricewei = await web3.eth.getGasPrice();
	    var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(),'gwei');
        var _gasLimit = 60999;
        
        console.log(nonce);
        
        var tx = {
          nonce: "0x" + nonce.toString(16),
          from: decryptedText.address,
          to: data.returnValues[1],
          gasPrice: web3
            .utils
            .toHex(_gasPriceGwei * 1e9),
          gasLimit: web3
            .utils
            .toHex(_gasLimit),
          chainId: 42,
          data: contract
            .methods
            .flushToken(process.env.ERC20_1)
            .encodeABI()
        };
        
        console.log(tx);
        
        var tx = await decryptedText.signTransaction(tx);
        await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function(a,b){
            console.log("Topic",a);
            returndata = a;
        })
	});

	//tokens ERC20_2
	var web3Contract_ERC20_2 = new web3.eth.Contract(ERC20abi,process.env.ERC20_2);
	var contract_2 = dagger.contract(web3Contract_ERC20_2);
	var filter1 = contract_2.events.Transfer({filter: {to: addressinfo.address}, room: 'latest'});
	// watch
	console.log(filter1);
	filter1.watch(async function(data, removed){
		console.log('DOX Recived');
		var a = await web3.eth.getTransaction(data.transactionHash);
	    console.log(a);
	    //TODO DB
	    var decryptedText = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY_ETH);
	    var contract = new web3.eth.Contract(forwarder,data.returnValues[1]);
	    var nonce = await web3.eth.getTransactionCount(decryptedText.address);
	    var gasPricewei = await web3.eth.getGasPrice();
	    var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(),'gwei');
        var _gasLimit = 60999;
       
        console.log(nonce);
       
        var tx = {
          nonce: "0x" + nonce.toString(16),
          from: decryptedText.address,
          to: data.returnValues[1],
          gasPrice: web3
            .utils
            .toHex(_gasPriceGwei * 1e9),
          gasLimit: web3
            .utils
            .toHex(_gasLimit),
          chainId: 42,
          data: contract
            .methods
            .flushToken(process.env.ERC20_2)
            .encodeABI()
        };
       
        console.log(tx);
       
        var tx = await decryptedText.signTransaction(tx);
        await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', function(a,b){
            console.log("Topic",a);
            returndata = a;
        })
        return returndata;
	});
}

userETHRecive = async ()=>{
	var dagger = new Dagger('wss://kovan.dagger.matic.network');
	var web3 = new Web3('wss://kovan.infura.io/ws/v3/b0814c44f1de43a1b2024f2c08f0eddc');
	var web3Contract1 = new web3.eth.Contract(abi,process.env.CONTRACT_ADDRESS);
	var con = dagger.contract(web3Contract1);
	var filter1 = con.events.Receive({room: 'latest'});
	console.log("ETH Listiner Started");
	// watch
	filter1.watch(async function(data, removed){
		console.log('ETH Recived');
		//TODO DB
		console.log(data);
		var a = await web3.eth.getTransaction(data.transactionHash);
	    console.log(a);
	});
}

module.exports = {
    userrecive,
    userETHRecive
}