var Web3 = require('web3');
var abi = require('./abi.json');
var decrytpKeyHelper = require("./get-decrypt-private-key");
var getnonce = require('./get-nonce');
var WalletModel = require("../models/v1/WalletModel");
var UserModel = require("../models/v1/UsersModel");
var CoinsModel = require("../models/v1/CoinsModel");
var helperFunction = require("./helpers");
var userreceivehook = require('./user-receive-hook');
var logger = require("../controllers/v1/logger")

var addressData = async () => {

  try {
    var web3 = new Web3(process.env.INFURA_URL);
    var gasPricewei = await web3.eth.getGasPrice();
    //var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(), 'gwei');
    var _gasLimit = 260000;
    // var address = '';
    var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
    var contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
    var encryptedHex = await decrytpKeyHelper.decryptPrivateKey(process.env.PRIVATE_KEY_ETH);
    var decryptedText = web3.eth.accounts.privateKeyToAccount(encryptedHex);
    console.log("decryptedText", decryptedText)
    var gaslimit = contract.getnewaddress;
    console.log(gaslimit)
    var nonce = await getnonce.getNonce();

    console.log(nonce)
    var tx = {
      nonce: "0x" + nonce.toString(16),
      from: decryptedText.address,
      to: process.env.CONTRACT_ADDRESS,
      gasPrice: web3
        .utils
        .toHex(gasPricewei),
      gasLimit: web3
        .utils
        .toHex(_gasLimit),
      chainId: process.env.CHAIN_ID,
      data: contract
        .methods
        .getnewaddress()
        .encodeABI()
    };

    var tx = await decryptedText.signTransaction(tx);
    console.log(tx);
    web3.eth.sendSignedTransaction(tx.rawTransaction).on('transactionHash', async function (a) {
      console.log("TX Hash", a);
      return a;
    }).on('receipt', async function (a) {
      console.log("Topic", a);

      await logger.info({
        "module": "Topic",
        "user_id": "user_erthereum",
        "url": "New Address Function",
        "type": "Success"
      }, userData)

      var address = ('0x' + a.logs[0].data.slice(26)).toString();

      await logger.info({
        "module": "Address success",
        "user_id": "user_erthereum",
        "url": "New Address Function",
        "type": "Success"
      }, address)

      var coinData = await CoinsModel
        .query()
        .select()
        .first()
        .where("deleted_at", null)
        .andWhere("is_active", true)
        .andWhere("coin_code", process.env.COIN)
        .orderBy("id", "DESC");

      console.log("coinData", coinData)

      await logger.info({
        "module": "Ethereum New Address Started",
        "user_id": "user_erthereum",
        "url": "New Address Function",
        "type": "Success"
      }, coinData)

      if (coinData != undefined) {
        var walletData = await WalletModel
          .query()
          .first()
          .select()
          .where("deleted_at", null)
          .andWhere("coin_id", coinData.id)
          .andWhere("receive_address", "")

        await logger.info({
          "module": "Wallet Data Retrieve Success",
          "user_id": "user_erthereum",
          "url": "New Address Function",
          "type": "Success"
        }, walletData)


        if (walletData != undefined) {
          var walletValue = await walletData
            .$query()
            .patch({
              "receive_address": address
            });
          await userreceivehook.userrecive({ address: address });
          var userData = await UserModel
            .query()
            .first()
            .select()
            .where("deleted_at", null)
            .andWhere("is_active", true)
            .andWhere("id", walletData.user_id)

          await logger.info({
            "module": "User Data Retrieved Started",
            "user_id": "user_erthereum",
            "url": "New Address Function",
            "type": "Success"
          }, userData)
          if (userData != undefined) {
            await helperFunction.SendEmail("wallet_created_successfully", userData)
          }
        }
      }

    });
    return true;
    // console.log(address);
  } catch (error) {
    console.log("Address Generation error :: ", error);
    await logger.error({
      "module": "User Data Retrieved Started",
      "user_id": "user_erthereum",
      "url": "New Address Function",
      "type": "Error"
    }, error)
  }
}

module.exports = {
  addressData
}