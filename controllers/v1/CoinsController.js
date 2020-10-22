/**
 * UsersController
 *
 */
const { raw } = require('objection');
var moment = require('moment');
var fetch = require('node-fetch');
const v = require('node-input-validator');
const Bluebird = require('bluebird');
fetch.Promise = Bluebird;
var bcrypt = require('bcryptjs');
var aesjs = require('aes-js');
var i18n = require("i18n");
var fs = require('file-system');
// Extra
var Helper = require("../../helpers/helpers");
var addressHelper = require("../../helpers/get-new-address");
var sendHelper = require("../../helpers/send");
var balanceHelper = require("../../helpers/get-receiveby-address");
var transactionHelper = require("../../helpers/get-wallet-balance");
var transactionDetailHelper = require("../../helpers/get-transaction");
var listTransactionHelper = require("../../helpers/list-transaction")
var balanceValueHelper = require("../../helpers/get-balance");
var getRawTransaction = require("../../helpers/get-raw-transaction");
var decodeRawTransaction = require("../../helpers/decode-raw-transaction");
var getFiatValuHelper = require("../../helpers/get-fiat-value");
var currencyConversionHelper = require("../../helpers/get-currency-conversion");
var getEstimatedFeeHelper = require("../../helpers/get-estimated-fee");
const constants = require('../../config/constants');
var userreceivehook = require('../../helpers/user-receive-hook');
// Controllers
var { AppController } = require('./AppController');
// Models
var UsersModel = require('../../models/v1/UsersModel');
var CoinsModel = require('../../models/v1/CoinsModel');
var WalletModel = require('../../models/v1/WalletModel');
var WalletHistoryModel = require('../../models/v1/WalletHistory');
var TransactionTableModel = require('../../models/v1/TransactionTableModel');
var UserNotificationModel = require("../../models/v1/UserNotifcationModel");
var CurrencyConversionModel = require("../../models/v1/CurrencyConversion");

var Web3 = require('web3');
var abi = require('../../helpers/abi.json');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));

/**
 * Users
 * It's contains all the opration related with users table. Like userList, userDetails,
 * createUser, updateUser, deleteUser and changeStatus
 */
class UsersController extends AppController {

    constructor() {
        super();
        var web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));
    }

    // Get User Address

    async createUserAddress(req, res) {
        try {
            var user_id = req.body.user_id;
            var label = req.body.label;
            var coinData = await CoinsModel
                .query()
                .first()
                .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                .andWhere('type', 1)
                .orderBy('id', 'DESC')

            if (coinData != undefined) {
                var walletData = await WalletModel
                    .query()
                    .first()
                    .where("deleted_at", null)
                    .andWhere("user_id", user_id)
                    .andWhere("coin_id", coinData.id)
                    .orderBy('id', 'DESC')

                console.log("walletData", walletData)

                if (walletData == undefined) {
                    var userReceiveAddress = await addressHelper.addressData();
                    console.log(userReceiveAddress);
                    var dataValue = await WalletModel
                        .query()
                        .insertAndFetch({
                            "receive_address": userReceiveAddress,
                            "coin_id": coinData.id,
                            "user_id": user_id,
                            "deleted_at": null,
                            "created_at": Date.now(),
                            "wallet_id": "wallet",
                            "address_label": label,
                            "balance": 0.0,
                            "placed_balance": 0.0
                        })
                    return res
                        .status(200)
                        .json({
                            "status": 200,
                            "message": "User Address has been created successfully.",
                            "data": dataValue
                        })
                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet has already been created"
                        })
                }
            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Get Warm Wallet and Custody Wallet Address

    async updateWalletAddress(req, res) {
        try {

            var coinData = await CoinsModel
                .query()
                .first()
                .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                // .andWhere('type', 2)
                .orderBy('id', 'DESC')

            var getWarmWalletAddress = await addressHelper.addressData();

            var getColdWalletAddress = await addressHelper.addressData();
            await coinData
                .$query()
                .patch({
                    "warm_wallet_address": getWarmWalletAddress,
                    "custody_wallet_address": getColdWalletAddress
                })

            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Address Created Successffully."
                })

        } catch (error) {
            console.log("Wallet Address error :: ", error);
        }
    }

    // Send susu coin to User Address

    async userSendFund(req, res) {
        try {
            console.log(req.body)
            var user_id = req.body.user_id;
            var amount = req.body.amount;
            var destination_address = req.body.destination_address;
            var faldax_fee = req.body.faldax_fee;
            var network_fee = req.body.network_fee;
            var is_admin = (req.body.is_admin) ? (req.body.is_admin) : false;
            console.log(req.body);
            console.log("is_admin", is_admin)
            var coinData = await CoinsModel
                .query()
                .first()
                // .where('deleted_at', null)
                .andWhere('coin_code', process.env.COIN)
                .andWhere('is_active', true)
                // .andWhere('type', 2)
                .orderBy('id', 'DESC')

            console.log(coinData);

            if (coinData != undefined) {

                var walletData = await WalletModel
                    .query()
                    .first()
                    .where("deleted_at", null)
                    .andWhere("user_id", user_id)
                    .andWhere("coin_id", coinData.id)
                    .andWhere("is_admin", is_admin)
                    .orderBy('id', 'DESC');

                console.log("walletData", walletData)

                // var getAccountBalance = await balanceValueHelper.balanceData();
                if (walletData != undefined) {
                    console.log("parseFloat(faldax_fee)", parseFloat(faldax_fee))
                    console.log("parseFloat(amount)", parseFloat(amount))
                    var balanceChecking = parseFloat(amount) + parseFloat(faldax_fee) + parseFloat(network_fee);
                    console.log("balanceChecking", balanceChecking)
                    // if (getAccountBalance >= balanceChecking) {
                    if (walletData.placed_balance >= balanceChecking) {
                        var sendObject = {
                            "address": destination_address,
                            "amount": amount,
                            "message": "test"
                        }

                        console.log("sendObject", sendObject)

                        var userReceiveAddress = await sendHelper.sendData(sendObject);
                        console.log("userReceiveAddress", userReceiveAddress)
                        if (userReceiveAddress.flag == 1) {
                            return res
                                .status(500)
                                .json({
                                    "status": 500,
                                    "message": userReceiveAddress.message
                                })
                        }
                        var getTransactionDetails = await transactionDetailHelper.getTransaction(userReceiveAddress);
                        console.log("getTransactionDetails", getTransactionDetails)
                        if (getTransactionDetails != undefined) {
                            var realNetworkFee = parseFloat(-(getTransactionDetails.fee)).toFixed(8)
                            var balanceUpdate = parseFloat(faldax_fee) + parseFloat(Math.abs(realNetworkFee))
                            var balanceValueUpdateValue = parseFloat(amount) + parseFloat(balanceUpdate);
                            var balanceValueUpdate = parseFloat(walletData.balance) - parseFloat(balanceValueUpdateValue);
                            var placedBlanaceValueUpdate = parseFloat(walletData.placed_balance) - parseFloat(balanceValueUpdateValue)
                            console.log("balanceValueUpdate", balanceValueUpdate)
                            console.log("placedBlanaceValueUpdate", placedBlanaceValueUpdate)
                            var walletDataUpdate = await WalletModel
                                .query()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("coin_id", coinData.id)
                                .andWhere("is_admin", is_admin)
                                .patch({
                                    "balance": balanceValueUpdate,
                                    "placed_balance": placedBlanaceValueUpdate
                                })

                            var getFiatValues = await getFiatValuHelper.getFiatValue(process.env.COIN);

                            console.log("getFiatValues", getFiatValues)


                            var transactionData = await WalletHistoryModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": balanceValueUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getTransactionDetails.txid,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": -(getTransactionDetails.fee),
                                    "estimated_network_fees": 0.01,
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin,
                                    "fiat_values": getFiatValues
                                });

                            var transactionValue = await TransactionTableModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": balanceValueUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getTransactionDetails.txid,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": -(getTransactionDetails.fee),
                                    "estimated_network_fees": 0.01,
                                    "transaction_from": "Send to Destination",
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin
                                });


                            if (is_admin == false) {
                                var walletBalance = await WalletModel
                                    .query()
                                    .first()
                                    .where("deleted_at", null)
                                    .andWhere("coin_id", coinData.id)
                                    .andWhere("is_admin", true)
                                    .andWhere("user_id", 36)
                                    .orderBy('id', 'DESC')
                                if (walletBalance != undefined) {
                                    var amountToBeAdded = 0.0
                                    amountToBeAdded = parseFloat(faldax_fee)
                                    console.log("amountToBeAdded", amountToBeAdded)
                                    console.log("walletBalance.balance", walletBalance.balance)
                                    var updateWalletBalance = await WalletModel
                                        .query()
                                        .where("deleted_at", null)
                                        .andWhere("coin_id", coinData.id)
                                        .andWhere("is_admin", true)
                                        .andWhere("user_id", 36)
                                        .patch({
                                            "balance": parseFloat(walletBalance.balance) + parseFloat(amountToBeAdded),
                                            "placed_balance": parseFloat(walletBalance.placed_balance) + parseFloat(amountToBeAdded)
                                        });

                                    var walletHistoryValue = await WalletHistoryModel
                                        .query()
                                        .insert({
                                            "source_address": walletData.receive_address,
                                            "destination_address": walletBalance.receive_address,
                                            "amount": parseFloat(amountToBeAdded).toFixed(8),
                                            "actual_amount": amount,
                                            "transaction_type": "send",
                                            "created_at": new Date(),
                                            "coin_id": coinData.id,
                                            "transaction_id": getTransactionDetails.txid,
                                            "faldax_fee": faldax_fee,
                                            "actual_network_fees": 0.0,
                                            "estimated_network_fees": 0.0,
                                            "user_id": 36,
                                            "is_admin": true,
                                            "fiat_values": getFiatValues
                                        })
                                }
                            }

                            var userData = await UsersModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("is_active", true)
                                .andWhere("id", user_id);

                            var userNotification = await UserNotificationModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("slug", "withdraw");

                            var coin_data = await CoinModel
                                .query()
                                .first()
                                .select()
                                .where("id", coinData.id);

                            if (coin_data != undefined) {
                                userData.coinName = coin_data.coin;
                            } else {
                                userData.coinName = "-";
                            }

                            // userData.coinName = coin.coin_code;
                            userData.amountReceived = parseFloat(userBalanceUpdateValue).toFixed(8);

                            console.log("userData", userData)

                            if (userNotification != undefined) {
                                if (userNotification.email == true || userNotification.email == "true") {
                                    if (userData.email != undefined) {
                                        console.log(userData);
                                        await Helper.SendEmail("withdraw", userData)
                                    }
                                }
                                if (userNotification.text == true || userNotification.text == "true") {
                                    if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
                                        await Helper.sendSMS("withdraw", userData)
                                    }
                                }
                            }
                        }

                        return res
                            .status(200)
                            .json({
                                "status": 200,
                                "message": "Send Coins successfully.",
                                "data": balanceValueUpdateValue
                            })
                    } else {
                        return res
                            .status(201)
                            .json({
                                "status": 201,
                                "message": "Insufficient Balance in the wallet"
                            })
                    }
                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet Data Not Found"
                        })
                }

            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Get User Balance
    async getUserBalance(req, res) {
        try {
            var address = req.body.address;

            var balanceValue = await balanceHelper.getReceiveByAddress(address);
            console.log("balanceValue", balanceValue)
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "User Balance has been retrieved successfully",
                    "data": balanceValue
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Get User Transactions Value
    async getUserTransactions(req, res) {
        try {
            var address = req.body.address;

            var transactionList = await transactionHelper.balanceData(address)
            var transactionDetails = [];
            console.log(transactionList)
            for (var i = 0; i < transactionList.length; i++) {
                console.log(transactionList[i])
                var detailValue = await transactionDetailHelper.getTransaction(transactionList[i]);
                console.log("Transaction ID >>>>>>>", transactionList[i], "-------==--------", detailValue);
                var obejct = {
                    "txid": transactionList[i],
                    "details": detailValue.details,
                    "amount": detailValue.amount
                }
                transactionDetails.push(obejct);
            }
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Transaction Details has been retreived Successfully",
                    "data": transactionDetails
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Get List of Transactions
    async getListTransactions(req, res) {
        try {
            var transactionList = await listTransactionHelper.listTransaction()
            console.log(transactionList)
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Transaction Details has been retreived Successfully",
                    "data": transactionList
                })
        } catch (error) {
            console.log(error)
        }
    }

    // Update File trnasaction Value for next webhook
    async fileValueUpdate(dataValue, flag) {
        return new Promise(async (resolve, reject) => {
            if (flag == 2) {
                fs.unlinkSync('transaction.txt')
            }
            var transactionHash;
            if (fs.existsSync('transaction.txt')) {
                await fs.readFile('transaction.txt', (err, data) => {
                    if (err) {
                        console.log(err)
                    }
                    var value = data.toString();
                    transactionHash = value.split(`"`)
                    if (flag == 1) {
                        resolve(transactionHash[1]);
                    }
                })
            } else {
                if (flag == 2) {
                    var value = await fs.writeFile("transaction.txt", JSON.stringify(dataValue), async function (err) {
                        if (err) {
                            console.log(err)
                        } else {
                            value = "File Written Successfully";
                        }
                        return value;
                    })
                    transactionHash = value;
                } else {
                    transactionHash = ''
                }
                resolve(transactionHash);
            }
        })
    }

    // If file transaction value and latest transaction are same then do nothing or if receive then update user wallet
    async getTransactionData(flag, entries, index, transactionValue) {
        if (flag == false || flag == "false" && entries < 50) {
            var dataValue = await listTransactionHelper.listTransaction(entries, index);
            var flagValue = false;
            for (var i = (dataValue.length - 1); i >= index; i--) {
                if (dataValue[i].txid == transactionValue) {
                    flagValue == true;
                    return 1;
                } else if (dataValue[i].category == "receive") {
                    var dataTransaction = await getRawTransaction.getTransaction(dataValue[i].txid)
                    console.log(dataTransaction)
                    var dataTransactionValue = await decodeRawTransaction.getTransaction(dataTransaction);
                    if (dataTransactionValue != null) {
                        console.log("dataTransactionValue", dataTransactionValue);
                        var sourcxeAddressValue = (dataTransactionValue['vout'])
                        var valiueIm = (dataTransactionValue['vout']);
                        sourcxeAddressValue = valiueIm[0]['scriptPubKey']['addresses'][0]

                        var walletHistoryData = await WalletHistoryModel
                            .query()
                            .first()
                            .where('deleted_at', null)
                            .andWhere('transaction_id', dataValue[i].txid)
                            .andWhere('transaction_type', 'receive')
                            .orderBy('id', 'DESC');
                        console.log("walletHistoryData", walletHistoryData);

                        if (walletHistoryData == undefined) {
                            // console.log("sourcxeAddressValue", sourcxeAddressValue)
                            var walletData = await WalletModel
                                .query()
                                .first()
                                .select()
                                .where('receive_address', dataValue[i].address)
                                .andWhere('deleted_at', null)
                                .orderBy('id', 'DESC');

                            console.log("walletData", walletData);

                            if (walletData != undefined) {
                                console.log("In sourcxeAddressValue", sourcxeAddressValue)
                                var object = {
                                    'destination_address': dataValue[i].address,
                                    'source_address': sourcxeAddressValue,
                                    'created_at': new Date(),
                                    'amount': dataValue[i].amount,
                                    "actual_amount": dataValue[i].amount,
                                    'coin_id': walletData.coin_id,
                                    'transaction_type': 'receive',
                                    'transaction_id': dataValue[i].txid,
                                    'user_id': walletData.user_id,
                                    'faldax_fee': 0.0,
                                    'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                    'estimated_network_fees': 0.01,
                                    "faldax_fee": 0.0,
                                    "residual_amount": 0.0,
                                    "user_id": walletData.user_id,
                                    "is_admin": false
                                }

                                console.log("object", object)
                                var walletHistoryData = await WalletHistoryModel
                                    .query()
                                    .insert({
                                        'destination_address': dataValue[i].address,
                                        'source_address': sourcxeAddressValue,
                                        'created_at': new Date(),
                                        'amount': dataValue[i].amount,
                                        "actual_amount": dataValue[i].amount,
                                        'coin_id': walletData.coin_id,
                                        'transaction_type': 'receive',
                                        'transaction_id': dataValue[i].txid,
                                        'user_id': walletData.user_id,
                                        'faldax_fee': 0.0,
                                        'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                        'estimated_network_fees': 0.01,
                                        "faldax_fee": 0.0,
                                        "residual_amount": 0.0,
                                        "user_id": walletData.user_id,
                                        "is_admin": false
                                    })

                                var transactionValue = await TransactionTableModel
                                    .query()
                                    .insert({
                                        'destination_address': dataValue[i].address,
                                        'source_address': sourcxeAddressValue,
                                        'created_at': new Date(),
                                        'amount': dataValue[i].amount,
                                        "actual_amount": dataValue[i].amount,
                                        'coin_id': walletData.coin_id,
                                        'transaction_type': 'receive',
                                        'transaction_id': dataValue[i].txid,
                                        'user_id': walletData.user_id,
                                        'faldax_fee': 0.0,
                                        'actual_network_fees': (dataValue[i].fee) ? (dataValue[i].fee) : (0.0),
                                        'estimated_network_fees': 0.01,
                                        "faldax_fee": 0.0,
                                        "residual_amount": 0.0,
                                        "transaction_from": "Destination To Receive",
                                        "user_id": walletData.user_id,
                                        "is_admin": false,
                                        "receiver_user_balance_before": walletData.balance
                                    });

                                var coinData = await CoinsModel
                                    .query()
                                    .first()
                                    // .where('deleted_at', null)
                                    .andWhere('coin_code', process.env.COIN)
                                    // .andWhere('is_active', true)
                                    .andWhere('type', 2)
                                    .orderBy('id', 'DESC')

                                var walletValue = await WalletModel
                                    .query()
                                    .first()
                                    .select()
                                    .where('deleted_at', null)
                                    .andWhere('coin_id', coinData.id)
                                    .andWhere('wallet_id', 'warm_wallet')
                                    .orderBy('id', 'DESC');

                                var updatedBalance = parseFloat(walletData.balance) + parseFloat(dataValue[i].amount)
                                var updatedPlacedBalance = parseFloat(walletData.placed_balance) + parseFloat(dataValue[i].amount)

                                var balanceData = await WalletModel
                                    .query()
                                    .where('receive_address', dataValue[i].address)
                                    .andWhere('deleted_at', null)
                                    .patch({
                                        'balance': updatedBalance,
                                        'placed_balance': updatedPlacedBalance
                                    });

                                var userData = await UsersModel
                                    .query()
                                    .first()
                                    .select()
                                    .where("deleted_at", null)
                                    .andWhere("is_active", true)
                                    .andWhere("id", user_id);

                                var userNotification = await UserNotificationModel
                                    .query()
                                    .first()
                                    .select()
                                    .where("deleted_at", null)
                                    .andWhere("user_id", user_id)
                                    .andWhere("slug", "receive");

                                if (coinData != undefined) {
                                    userData.coinName = coinData.coin;
                                } else {
                                    userData.coinName = "-";
                                }

                                userData.amountReceived = (valueToBeAdded).toFixed(8);

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
                if (flagValue == true) {
                    break;
                }
            }
            if (flagValue == true) {
                return 1;
            } else {
                await module.exports.getTransactionData(false, (entries + 10), (index + 10))
            }
        } else {
            return 1;
        }
    }

    // Webhook for transaction history
    async returnWebhookdata() {
        try {
            console.log("ISNIDE METHOD")
            var transactionHash;
            var transactionValue = await module.exports.fileValueUpdate("", 1)
            var dataValue = await listTransactionHelper.listTransaction(10, 0);
            var data = dataValue[dataValue.length - 1].txid;
            var value = await module.exports.getTransactionData(false, 10, 0, transactionValue)
            var transactionValue = await module.exports.fileValueUpdate(data, 2)
        } catch (error) {
            console.log(error);
        }
    }

    async getEquivalentValue(req, res) {
        try {
            var data = await currencyConversionHelper.convertValue();
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Currency Value has been retrieved successfully",
                    "data": data
                })
        } catch (error) {
            console.log(error);
        }
    }

    /*
  Ethereum Estimate Fees
  */
    async getBalanceValue(req, res) {
        try {
            var getAccountBalance = await transactionHelper.balanceData();

            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Admin Balance has been listed successfully",
                    "data": getAccountBalance
                })
        } catch (error) {
            console.log(error);
        }
    }

    async getEstimatedFees(req, res) {
        try {
            let req_body = req.body;
            var getFee = await getEstimatedFeeHelper.getFee();
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Ethereum Fees",
                    "data": { "fee": getFee }
                })
        } catch (error) {
            console.log(error);
        }
    }

    /*
    Ethereum Send Funds
    */
    async sendTest(req, res) {
        try {
            let req_body = req.body;

            console.log("req_body", req_body)

            var user_id = req.body.user_id;
            var amount = req.body.amount;
            var destination_address = req.body.destination_address;
            var faldax_fee = req.body.faldax_fee;
            var network_fee = req.body.network_fee;
            var is_admin = (req.body.is_admin) ? (req.body.is_admin) : false;

            var coinData = await CoinsModel
                .query()
                .first()
                // .where('deleted_at', null)
                .andWhere('coin', req_body.coin)
                .andWhere('is_active', true)
                // .andWhere('type', 2)
                .orderBy('id', 'DESC')

            console.log(coinData);

            if (coinData != undefined) {

                var walletData = await WalletModel
                    .query()
                    .first()
                    .where("deleted_at", null)
                    .andWhere("user_id", user_id)
                    .andWhere("coin_id", coinData.id)
                    .andWhere("is_admin", is_admin)
                    .orderBy('id', 'DESC');

                console.log("walletData", walletData)

                if (walletData != undefined) {

                    var balanceChecking = parseFloat(amount) + parseFloat(faldax_fee) + parseFloat(network_fee);

                    if (walletData.placed_balance >= balanceChecking) {

                        var senddetails = {
                            "address": destination_address,
                            "amount": amount,
                            "coin": req_body.coin
                        }

                        console.log("senddetails", senddetails)
                        var getFee = await sendHelper.sendData(senddetails);

                        console.log("getFee", getFee)

                        if (getFee != undefined) {
                            var gasPrice = await web3.eth.getGasPrice();
                            var gasUsed = await getFee.gasUsed;
                            var fees = gasPrice * gasUsed;
                            var realNetworkFee = web3.utils.fromWei(fees.toString(), 'ether');
                            console.log("realNetworkFee", realNetworkFee)
                            var balanceUpdate = parseFloat(faldax_fee) + parseFloat(Math.abs(realNetworkFee))
                            var balanceValueUpdateValue = parseFloat(amount) + parseFloat(balanceUpdate);
                            var balanceValueUpdate = parseFloat(walletData.balance) - parseFloat(balanceValueUpdateValue);
                            var placedBlanaceValueUpdate = parseFloat(walletData.placed_balance) - parseFloat(balanceValueUpdateValue)
                            console.log("balanceValueUpdate", balanceValueUpdate)
                            console.log("placedBlanaceValueUpdate", placedBlanaceValueUpdate);

                            var walletDataUpdate = await WalletModel
                                .query()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("coin_id", coinData.id)
                                .andWhere("is_admin", is_admin)
                                .patch({
                                    "balance": balanceValueUpdate,
                                    "placed_balance": placedBlanaceValueUpdate
                                })

                            var getFiatValues = await getFiatValuHelper.getFiatValue(process.env.COINFIAT);

                            console.log("getFiatValues", getFiatValues);

                            console.log("getFee.logs[0].transactionHash", getFee.transactionHash)

                            console.log("parseFloat(amount) + parseFloat(faldax_fee)", parseFloat(amount) + parseFloat(faldax_fee))


                            var transactionData = await WalletHistoryModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": parseFloat(amount) + parseFloat(faldax_fee),
                                    "actual_amount": parseFloat(amount),
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getFee.transactionHash,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": realNetworkFee,
                                    "estimated_network_fees": network_fee,
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin,
                                    "fiat_values": getFiatValues
                                });

                            var transactionValue = await TransactionTableModel
                                .query()
                                .insert({
                                    "source_address": walletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": parseFloat(amount) + parseFloat(faldax_fee),
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": coinData.id,
                                    "transaction_id": getFee.transactionHash,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": realNetworkFee,
                                    "estimated_network_fees": 0.01,
                                    "transaction_from": "Send to Destination",
                                    "user_id": walletData.user_id,
                                    "is_admin": is_admin
                                });

                            if (is_admin == false) {
                                var walletBalance = await WalletModel
                                    .query()
                                    .first()
                                    .where("deleted_at", null)
                                    .andWhere("coin_id", coinData.id)
                                    .andWhere("is_admin", true)
                                    .andWhere("user_id", process.env.ADMIN_ID)
                                    .orderBy('id', 'DESC');

                                if (walletBalance != undefined) {
                                    var amountToBeAdded = 0.0
                                    amountToBeAdded = parseFloat(faldax_fee)
                                    console.log("amountToBeAdded", amountToBeAdded)
                                    console.log("walletBalance.balance", walletBalance.balance);
                                    var updateWalletBalance = await WalletModel
                                        .query()
                                        .where("deleted_at", null)
                                        .andWhere("coin_id", coinData.id)
                                        .andWhere("is_admin", true)
                                        .andWhere("user_id", process.env.ADMIN_ID)
                                        .patch({
                                            "balance": parseFloat(walletBalance.balance) + parseFloat(amountToBeAdded),
                                            "placed_balance": parseFloat(walletBalance.placed_balance) + parseFloat(amountToBeAdded)
                                        });

                                    var walletHistoryValue = await WalletHistoryModel
                                        .query()
                                        .insert({
                                            "source_address": walletData.receive_address,
                                            "destination_address": walletBalance.receive_address,
                                            "amount": parseFloat(amountToBeAdded).toFixed(8),
                                            "actual_amount": amount,
                                            "transaction_type": "send",
                                            "created_at": new Date(),
                                            "coin_id": coinData.id,
                                            "transaction_id": getFee.transactionHash,
                                            "faldax_fee": faldax_fee,
                                            "actual_network_fees": realNetworkFee,
                                            "estimated_network_fees": network_fee,
                                            "user_id": 36,
                                            "is_admin": true,
                                            "fiat_values": getFiatValues
                                        })
                                }
                            }

                            var userData = await UsersModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("is_active", true)
                                .andWhere("id", user_id);

                            var userNotification = await UserNotificationModel
                                .query()
                                .first()
                                .select()
                                .where("deleted_at", null)
                                .andWhere("user_id", user_id)
                                .andWhere("slug", "withdraw");

                            var coin_data = await CoinsModel
                                .query()
                                .first()
                                .select()
                                .where("id", coinData.id);

                            if (coin_data != undefined) {
                                userData.coinName = coin_data.coin;
                            } else {
                                userData.coinName = "-";
                            }

                            // userData.coinName = coin.coin_code;
                            userData.amountReceived = parseFloat(balanceValueUpdateValue).toFixed(8);

                            console.log("userData", userData)

                            if (userNotification != undefined) {
                                if (userNotification.email == true || userNotification.email == "true") {
                                    if (userData.email != undefined) {
                                        console.log(userData);
                                        await Helper.SendEmail("withdraw", userData)
                                    }
                                }
                                if (userNotification.text == true || userNotification.text == "true") {
                                    if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
                                        await Helper.sendSMS("withdraw", userData)
                                    }
                                }
                            }

                            return res
                                .status(200)
                                .json({
                                    "status": 200,
                                    "message": "Ethereum Fees",
                                    "data": balanceValueUpdateValue
                                })
                        } else {
                            return res
                                .status(500)
                                .json({
                                    "status": 500,
                                    "message": "Transaction Has been reverted by EVM"
                                })
                        }
                    } else {
                        return res
                            .status(201)
                            .json({
                                "status": 201,
                                "message": "Insufficient Balance in the wallet"
                            })
                    }
                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet Data Not Found"
                        })
                }
            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
            }

        } catch (error) {
            console.log(error);
        }
    }

    /*
    Ethereum Get All Transactions
    */
    async getAllTransactionList(req, res) {
        try {
            console.log("req.url", req.url)
            var coinValue = req.query.coin;
            // console.log("process.env.COIN", process.env.COI)

            console.log("req.query.coin", req.query.coin)

            var coinData = await CoinsModel
                .query()
                .first()
                .select("id", "deleted_at", "is_active", "coin_code", "iserc", "coin_precision")
                .where("deleted_at", null)
                .andWhere("is_active", true)
                .andWhere("coin_code", coinValue)
                .orderBy("id", "DESC");

            console.log("coinData", coinData)

            var getTransactionData = await WalletHistoryModel
                .query()
                .select("transaction_type", "id", "amount", "transaction_id", "actual_network_fees", "created_at")
                .where("deleted_at", null)
                .andWhere("coin_id", coinData.id);
            console.log("getTransactionData", getTransactionData)

            var coinFiatValue = await CurrencyConversionModel
                .query()
                .first()
                .select()
                .where("deleted_at", null)
                .andWhere("coin_id", coinData.id)
                .orderBy("id", "DESC");

            var responseObject = {}

            var transfers = [];

            console.log("getTransactionData", getTransactionData.length)

            for (var i = 0; i < 30; i++) {
                var pushObject = {};
                pushObject = {
                    type: getTransactionData[i].transaction_type,
                    baseValue: (getTransactionData[i].amount * coinData.coin_precision),
                    baseValueString: getTransactionData[i].amount * coinData.coin_precision,
                    coin: coinData.coin_code,
                    createdTime: moment(getTransactionData[i].getTransactionData).format("DD-MM-YYYY h:mm:ss"),
                    date: moment(getTransactionData[i].created_at).format("DD-MM-YYYY h:mm:ss"),
                    feeString: getTransactionData[i].actual_network_fees * coinData.coin_precision,
                    normalizedTxHash: getTransactionData[i].transaction_id,
                    txid: (getTransactionData[i].transaction_id),
                    usdRate: (coinFiatValue != undefined && coinFiatValue.quote != undefined) ? (coinFiatValue.quote["USD"].price) : (0.0),
                    usd: (coinFiatValue != undefined && coinFiatValue.quote != undefined) ? ((getTransactionData[i].amount) * coinFiatValue.quote["USD"].price) : (0.0),
                    value: Number(parseFloat(getTransactionData[i].amount * coinData.coin_precision).toFixed(8)),
                    valueString: (getTransactionData[i].amount * coinData.coin_precision).toString(),
                    wallet: process.env.CONTRACT_ADDRESS
                }
                transfers.push(pushObject)
            }
            responseObject.coin = coinData.coin_code;
            responseObject.transfers = transfers;
            return res
                .status(200)
                .json({
                    "status": 200,
                    "data": responseObject
                })

        } catch (error) {
            console.log("error", error);
        }
    }


    //TODO Remove this function and add the userreceivehook.userrecive line after the account is created
    async getListner(req, res) {
        try {
            let req_body = req.body;
            var getFee = await userreceivehook.userrecive({address: '0x636a5a4c6f641a615553aca1bf9419b849784aaa'});
            return res
                .status(200)
                .json({
                    "status": 200,
                    "message": "Ethereum Fees",
                    "data": { "fee": getFee }
                })
        } catch (error) {
            console.log(error);
        }
    }
}


module.exports = new UsersController();