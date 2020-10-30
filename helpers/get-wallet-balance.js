var Web3 = require('web3');
var abi = require('./ERC20abi.json');

var balanceData = async (address) => {
    var balanceValue;
    try {
        var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
        var contract1 = new web3.eth.Contract(abi,process.env.ERC20_1);
        var contract2 = new web3.eth.Contract(abi,process.env.ERC20_2);
        var eth_balance = await web3.eth.getBalance(process.env.CONTRACT_ADDRESS);
        var ERC20_1_balance = await contract1.methods.balanceOf(process.env.CONTRACT_ADDRESS).call();
        var ERC20_2_balance = await contract2.methods.balanceOf(process.env.CONTRACT_ADDRESS).call();
        var allbalance = {
            "eth_balance": web3.utils.fromWei(eth_balance.toString(),'ether'),
            "qrdx_balance": web3.utils.fromWei(ERC20_1_balance,'ether'),
            "dox_balance": web3.utils.fromWei(ERC20_2_balance,'ether')
        }
        console.log(allbalance);
        return allbalance;
    } catch (error) {
        console.log("Balance error :: ", error);
    }
}

module.exports = {
    balanceData
}