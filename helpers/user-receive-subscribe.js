var WalletModel = require("../models/v1/WalletModel");
var CoinsModel = require("../models/v1/CoinsModel")
var userreceivehook = require("./user-receive-hook")

var walletSubscribe = async () => {

    var coinData = await CoinsModel
        .query()
        .first()
        .select()
        .where("deleted_at", null)
        .andWhere("coin_code", process.env.COIN)
        .orderBy("id", "DESC");

    var walletData = await WalletModel
        .query()
        .select()
        .where("deleted_at", null)
        .andWhere("coin_id", coinData.id)
        .orderBy("id", "DESC")
        .limit(3);
    console.log("walletData", walletData)

    if (walletData != undefined) {
        console.log("walletData.length", walletData.length);
        for (var i = 0; i < walletData.length; i++) {
            // console.log("walletData[i].receive_address", walletData[i].receive_address)
            await userreceivehook.userrecive({ address: walletData[i].receive_address });
        }
    }
}

module.exports = {
    walletSubscribe
}