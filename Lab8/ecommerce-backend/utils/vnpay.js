const crypto = require("crypto");
const querystring = require("querystring");
const moment = require("moment");

class VNPayService {
  constructor() {
    this.vnpayConfig = {
      vnp_TmnCode: process.env.VNPAY_TMN_CODE,
      vnp_HashSecret: process.env.VNPAY_HASH_SECRET,
      vnp_Url: process.env.VNPAY_URL,
      vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
      vnp_IpnUrl: process.env.VNPAY_IPN_URL,
    };
  }

  /**
   * Sort object by key (VNPay requirement)
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    keys.forEach((key) => {
      sorted[key] = obj[key];
    });

    return sorted;
  }

  /**
   * Generate secure hash
   */
  generateSecureHash(params, hashSecret) {
    const sortedParams = this.sortObject(params);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", hashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    return signed;
  }

  /**
   * Create payment URL
   * @param {Object} options - Payment options
   * @param {string} options.orderId - Order ID
   * @param {number} options.amount - Amount in VND
   * @param {string} options.orderInfo - Order description
   * @param {string} options.ipAddress - Customer IP
   * @param {string} options.locale - Language (vn/en)
   * @param {string} options.bankCode - Bank code (optional)
   * @returns {string} Payment URL
   */
  createPaymentUrl(options) {
    const { orderId, amount, orderInfo, ipAddress, locale = "vn", bankCode = "" } = options;

    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const txnRef = `${orderId}_${Date.now()}`;

    let vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.vnpayConfig.vnp_TmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100, // VNPay requires amount * 100
      vnp_ReturnUrl: this.vnpayConfig.vnp_ReturnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    // Sort and generate hash
    vnpParams = this.sortObject(vnpParams);
    const secureHash = this.generateSecureHash(vnpParams, this.vnpayConfig.vnp_HashSecret);
    vnpParams.vnp_SecureHash = secureHash;

    // Build URL
    const paymentUrl = this.vnpayConfig.vnp_Url + "?" + querystring.stringify(vnpParams, { encode: false });

    return {
      paymentUrl,
      txnRef,
    };
  }

  /**
   * Verify return URL
   */
  verifyReturnUrl(vnpParams) {
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", this.vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    return secureHash === signed;
  }

  /**
   * Get response message from response code
   */
  getResponseMessage(responseCode) {
    const messages = {
      "00": "Transaction successful",
      "07": "Transaction successful. Suspicious transaction (related to fraud, unusual transaction)",
      "09": "Transaction failed. Customer card not registered for Internet Banking",
      10: "Transaction failed. Customer authenticated card information incorrectly more than 3 times",
      11: "Transaction failed. Payment timeout. Please retry.",
      12: "Transaction failed. Customer card is locked",
      13: "Transaction failed. Customer entered incorrect OTP",
      24: "Transaction cancelled",
      51: "Transaction failed. Customer account insufficient balance",
      65: "Transaction failed. Customer exceeded daily transaction limit",
      75: "Payment gateway under maintenance",
      79: "Transaction failed. Customer entered payment password incorrectly too many times",
      99: "Unknown error",
    };

    return messages[responseCode] || "Unknown response code";
  }

  /**
   * Check if transaction is successful
   */
  isSuccessTransaction(responseCode) {
    return responseCode === "00";
  }
}

module.exports = new VNPayService();
