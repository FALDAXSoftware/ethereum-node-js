var Web3 = require('web3');
const Dagger = require('@maticnetwork/dagger');
var abi = require('./abi.json');
var ERC20abi = require('./ERC20abi.json');
var forwarder = require('./forwarder.json')

var Helper = require("./helpers");

var CoinsModel = require("../models/v1/CoinsModel");
var WalletModel = require("../models/v1/WalletModel");
var WalletHistoryModel = require("../models/v1/WalletHistory");
var TransactionTabelModel = require("../models/v1/TransactionTableModel");
var UserNotificationModel = require("../models/v1/UserNotifcationModel");
var UsersModel = require("../models/v1/UsersModel");

var userSendNotification = async (data) => {

  console.log("data", data)

  var walletHistoryData = await WalletHistoryModel
    .query()
    .first()
    .select()
    .where("deleted_at", null)
    .andWhere("transaction_id", data.transaction_hash);

  console.log("walletHistoryData", walletHistoryData)

  if (walletHistoryData == undefined) {
    var coinData = await CoinsModel
      .query()
      .first()
      .select()
      .where("deleted_at", null)
      .andWhere("is_active", true)
      .andWhere("coin", data.coin)
      .orderBy("id", "DESC");

    console.log("coinData", coinData)

    if (coinData != undefined) {
      var walletData = await WalletModel
        .query()
        .first()
        .select()
        .where("deleted_at", null)
        .andWhere("coin_id", coinData.id)
        .andWhere("receive_address", data.destination_address)
        .orderBy("id", "DESC");

      console.log("walletData", walletData)

      if (walletData != undefined) {
        // var amount = 
        var balanceToBeUpdated = Number(parseFloat(parseFloat(walletData.balance) + parseFloat(data.amount)).toFixed(8));
        var placedBalanceToBeUpdated = Number(parseFloat(parseFloat(walletData.placed_balance) + parseFloat(data.amount)).toFixed(8));
        let walletHistory = {
          coin_id: coinData.id,
          source_address: data.source,
          destination_address: data.destination_address,
          user_id: walletData.user_id,
          amount: Number(parseFloat(data.amount).toFixed(8)),
          transaction_type: 'receive',
          transaction_id: data.transaction_hash
        }


        console.log("walletHistory", walletHistory)
        // Entry in wallet history
        await WalletHistoryModel
          .query()
          .insert({
            ...walletHistory
          });

        let transactionHistory = {
          coin_id: coinData.id,
          source_address: data.source,
          destination_address: data.destination_address,
          user_id: walletData.user_id,
          amount: Number(parseFloat(data.amount).toFixed(8)),
          transaction_type: 'receive',
          transaction_id: data.transaction_hash,
          actual_amount: Number(parseFloat(data.amount).toFixed(8)),
          receiver_user_balance_before: walletData.balance,
          // transaction_from: process.env.RECEIVE_TO_DESTINATION,
          actual_network_fees: 0.0,
          faldax_fee: 0.0,
          estimated_network_fees: 0.0,
          residual_amount: 0.0,
          is_done: false,
          is_admin: false
        }

        console.log("transactionHistory", transactionHistory)

        await TransactionTabelModel
          .query()
          .insert({
            ...transactionHistory
          });

        await WalletModel
          .query()
          .where("deleted_at", null)
          .andWhere("coin_id", coinData.id)
          .andWhere("receive_address", data.destination_address)
          .patch({
            balance: balanceToBeUpdated,
            placed_balance: placedBalanceToBeUpdated
          });

        var userData = await UsersModel
          .query()
          .first()
          .select()
          .where("deleted_at", null)
          .andWhere("is_active", true)
          .andWhere("id", walletData.user_id)
          .orderBy("id", "DESC");

        console.log("userData", userData)

        var userNotification = await UserNotificationModel
          .query()
          .first()
          .select()
          .where("user_id", walletData.user_id)
          .andWhere("deleted_at", null)
          .andWhere("slug", "receive")
          .orderBy("id", "DESC");

        console.log(userNotification)
        // Pass Amount
        if (coinData != undefined) {
          userData.coinName = coinData.coin;
        } else {
          userData.coinName = "-";
        }
        userData.amountReceived = Number(parseFloat(data.amount).toFixed(8));

        console.log("userData", userData)

        if (userNotification != undefined) {
          if (userNotification.email == true || userNotification.email == "true") {
            if (userData.email != undefined) {
              console.log(userData);
              await Helper.SendEmail("receive", userData)
            }
          }
          if (userNotification.text == true || userNotification.text == "true") {
            if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
              await Helper.sendSMS("receive", userData)
            }
          }
        }
      }

    }
  }

}

var userrecive = async (addressinfo) => {
  var dagger = new Dagger('wss://kovan.dagger.matic.network');
  var web3 = new Web3('wss://kovan.infura.io/ws/v3/b0814c44f1de43a1b2024f2c08f0eddc');
  //tokens ERC20_1
  var web3Contract_ERC20_1 = new web3.eth.Contract(ERC20abi, process.env.ERC20_1);
  var contract_1 = dagger.contract(web3Contract_ERC20_1);
  var filter = contract_1.events.Transfer({ filter: { to: addressinfo.address }, room: 'latest' });
  // console.log(filter);
  // watch
  filter.watch(async function (data, removed) {
    console.log('QRXD Recived');
    var a = await web3.eth.getTransaction(data.transactionHash);
    console.log(a);
    //TODO DB

    var decryptedText = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY_ETH);
    var contract = new web3.eth.Contract(forwarder, data.returnValues[1]);
    var nonce = await web3.eth.getTransactionCount(decryptedText.address);
    var gasPricewei = await web3.eth.getGasPrice();
    var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(), 'gwei');
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
    await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', async function (a, b) {
      console.log("Topic", a);
      returndata = a;
      // var dataValue = {
      //   coin: 'QRXD',
      //   amount: Number(parseFloat(web3.utils.fromWei((data.returnValues[2]).toString(), 'ether')).toFixed(8)),
      //   source: (data.returnValues[1]).toLowerCase(),
      //   destination_address: (data.returnValues[0]).toLowerCase(),
      //   transaction_hash: data.transactionHash
      // }

      // console.log("dataValue", dataValue);
      // await module.exports.userSendNotification(dataValue)
    })
  });

  //tokens ERC20_2
  var web3Contract_ERC20_2 = new web3.eth.Contract(ERC20abi, process.env.ERC20_2);
  var contract_2 = dagger.contract(web3Contract_ERC20_2);
  var filter1 = contract_2.events.Transfer({ filter: { to: addressinfo.address }, room: 'latest' });
  // console.log("filter1", filter1)
  // watch
  // console.log(filter1);
  filter1.watch(async function (data, removed) {
    console.log("removed", removed);
    console.log("data", data)
    console.log('DOX Recived');
    var a = await web3.eth.getTransaction(data.transactionHash);
    console.log(a);
    //TODO DB
    var decryptedText = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY_ETH);
    var contract = new web3.eth.Contract(forwarder, data.returnValues[1]);
    var nonce = await web3.eth.getTransactionCount(decryptedText.address);
    var gasPricewei = await web3.eth.getGasPrice();
    var _gasPriceGwei = web3.utils.fromWei(gasPricewei.toString(), 'gwei');
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
    await web3.eth.sendSignedTransaction(tx.rawTransaction).on('receipt', async function (a, b) {
      console.log("Topic", a);
      returndata = a;
      console.log("DB operations>>>>>>")
      // var dataValue = {
      //   coin: 'DOX',
      //   amount: Number(parseFloat(web3.utils.fromWei((data.returnValues[2]).toString(), 'ether')).toFixed(8)),
      //   source: (data.returnValues[0]).toLowerCase(),
      //   destination_address: (data.returnValues[1]).toLowerCase(),
      //   transaction_hash: data.transactionHash
      // }
      // console.log("dataValue", dataValue);
      // await module.exports.userSendNotification(dataValue)
    })
    return returndata;
  });
}

userETHRecive = async () => {
  try {
    var dagger = new Dagger('wss://kovan.dagger.matic.network');
    // console.log("dagger", dagger)
    var web3 = new Web3('wss://kovan.infura.io/ws/v3/b0814c44f1de43a1b2024f2c08f0eddc');
    var web3Contract1 = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
    var con = dagger.contract(web3Contract1);
    // dagger.error((err) => {
    //   console.log("Dagger Error", err)
    // })
    console.log("con>>>>>>>>>>>", con)
    var filter1 = con.events.Receive({ room: 'latest' });
    console.log("ETH Listiner Started");
    // watch
    // filter1.status(async function (data, removed) {
    //   console.log("data???????", data);
    //   console.log("removed??????", removed)
    // })
    filter1.watch(async function (data, removed) {
      console.log('ETH Recived');
      console.log("data????????", data);
      console.log("removed??????", removed)
      //TODO DB
      console.log(data);
      var a = await web3.eth.getTransaction(data.transactionHash);
      console.log(a);
      var dataValue = {
        coin: 'ETH',
        amount: Number(parseFloat(web3.utils.fromWei((a.value).toString(), 'ether')).toFixed(8)),
        source: (a.from).toLowerCase(),
        destination_address: (data.returnValues[0]).toLowerCase(),
        transaction_hash: data.transactionHash
      }
      console.log("dataValue", dataValue)
      await module.exports.userSendNotification(dataValue);
    });
  } catch (error) {
    console.log("Error Catched", error)
  }
}

module.exports = {
  userrecive,
  userETHRecive,
  userSendNotification
}