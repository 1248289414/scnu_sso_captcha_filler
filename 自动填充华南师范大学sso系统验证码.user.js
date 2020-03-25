// ==UserScript==
// @name         自动填充华南师范大学sso系统验证码
// @version      v1.3
// @author       1248289414
// @namespace    https://github.com/1248289414
// @description  基于tensorflow.js实现自动填充华南师范大学sso系统验证码，目前模型准确率50%。
// @match        https://sso.scnu.edu.cn/AccountService/openapi/login.html*
// @match        https://sso.scnu.edu.cn/AccountService/user/login.html
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.0/dist/tf.min.js
// ==/UserScript==

const characters = "abcdefghijklmnopqrstuvwxyz0123456789"
const DBname = "scnusso-captcha-model-2"
let model;

function decode(y) {
    let code = '';
    for(let i in y){
        const indices = tf.argMax(y[i],-1).dataSync()[0];
        code += characters[indices];
    }
    return code;
}

async function run() {
    // 获取验证码图片，判断是否加载成功
    const imgEl = document.getElementById("codeimg");
    if (imgEl.height != 48 || imgEl.width != 96) {
        return
    }

    await indexedDB.open(DBname);
    // 打开模型，失败则退出
    try {
        model = await tf.loadLayersModel("indexeddb://" + DBname);
    } catch (e) {
        console.log("本地加载模型失败，尝试从CDN加载模型");
        try {
            model = await tf.loadLayersModel("https://cdn.jsdelivr.net/gh/1248289414/scnu_sso_captcha_filler@v1.2/model/model.json");
            await model.save("indexeddb://" + DBname);
        } catch (e) {
            console.log("从CDN加载模型失败");
        }
    }

    if(!model){
        console.log("没有可用的模型，退出");
        return;
    }

    //将验证码图片转换成模型的输入向量[1,50,100,3]
    let img = tf.browser.fromPixels(imgEl);
    img = tf.image.resizeBilinear(img,[50, 100]);// 下载下来的样本是100*50,在这里得到的tensor是96*48
    img = img.div(tf.scalar(255));
    img = img.reshape([1,50,100,3]);

    const ret = model.predict(img);
    const preCode = decode(ret);

    // 填入验证码
    let rancodeEl = document.getElementById("rancode");
    rancodeEl.value = preCode;
}

(async function () {
    'use strict';

    const imgEl = document.getElementById("codeimg");
    imgEl.addEventListener("load",run);
})();
