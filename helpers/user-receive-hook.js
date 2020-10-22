var Web3 = require('web3');
var abi = require('./abi.json');
var ERC20abi = require('./ERC20abi.json');

var userrecive = async (addressinfo) => {
	const dagger = new Dagger('wss://kovan.dagger.matic.network');
	var web3 = new Web3('wss://kovan.infura.io/ws/v3/b0814c44f1de43a1b2024f2c08f0eddc');
	//tokens ERC20_1
	var web3Contract_ERC20_1 = new web3.eth.Contract(ERC20abi,process.env.ERC20_1);
	var contract_1 = dagger.contract(web3Contract_ERC20_1);
	var filter = contract_1.events.Transfer({filter: {to: addressinfo.address}, room: 'latest'});
	// watch
	filter.watch(async function(data, removed){
		console.log('QRXD Recived');
		var a = await web3.eth.getTransaction(data.transactionHash);
	    console.log(a);
	});

	//tokens ERC20_2
	var web3Contract_ERC20_2 = new web3.eth.Contract(ERC20abi,process.env.ERC20_2);
	var contract_2 = dagger.contract(web3Contract_ERC20_2);
	var filter = contract_2.events.Transfer({filter: {to: addressinfo.address}, room: 'latest'});
	// watch
	filter.watch(async function(data, removed){
		console.log('DOX Recived');
		var a = await web3.eth.getTransaction(data.transactionHash);
	    console.log(a);
	});
}

module.exports = {
    userrecive
}