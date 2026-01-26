const axios = require("axios");

const BOT_TOKEN = "8402037228:AAGUoVeE7wn-0xSfSUEEOCILkvHC_VQfbxU";
const CHAT_ID = "-1003719659616";

async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await axios.post(url, {
    chat_id: CHAT_ID,
    text,
    parse_mode: "HTML"
  });
}

module.exports = { sendMessage };
