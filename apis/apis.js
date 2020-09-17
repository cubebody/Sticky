import {promisifyAll} from 'miniprogram-api-promise';
// 获取小程序全局配置（变量、函数等）
const wxp = {}
promisifyAll(wx, wxp)
let loginEnforce = false
// 定义网络请求API地址
const BaseURL = 'https://api.bytebody.com'
const AuthTokenName = 'authToken'
const NetworkError = "网络错误，请检查网络"
const HTTPCode = {
    OK: 200,
    BadRequest: 400,
    Unauthorized: 401,
    NetworkError: -1
}

const defaultHeader = {
    Type: "miniprogram",
    "X-Version-Code": "1.0.0",
    "X-APP-ID": "wxae0d23630594d9a0"
}

const fetch = async (path, data, method, header, ...other) => {
    if (!header) {
        header = {}
    }
    header = {...header, ...defaultHeader}
    try {
        return await wxp.request({// 请求地址拼
            url: BaseURL + path,
            data: data,
            // 获取请求头配置
            header: header,
            method: method,
            ...other,
        })
    } catch (e) {
        console.log("fetch:", e)
        return {statusCode: HTTPCode.NetworkError}
    }
}

// 重构请求方式
const authFetch = async (path, data, method, header) => {
    const auth = wx.getStorageSync(AuthTokenName)
    // auth 不存在或者已过期
    if (!auth || auth.expires < new Date()) {
        return {statusCode: HTTPCode.Unauthorized}
    }
    return await fetch(path, data, method, {"Authorization": auth.token, ...header})
}

const login = async (enforce) => {
    if (!enforce) {
        const auth = wx.getStorageSync(AuthTokenName)
        // auth 不存在或者已过期
        if (auth && Date.parse(auth.expires) > new Date()) {
            console.log("auth:", auth)
            return {statusCode: HTTPCode.OK, data: auth}
        }
    }
    try {
        const result = await wxp.login()
        const data = {code: result.code, system: wx.getSystemInfoSync()}
        const other = {dateType: "其他"}
        const response = await fetch("/auth/miniprogram/token", data, "post", null, other)
        if (response.statusCode === HTTPCode.OK) {
            wx.setStorageSync(AuthTokenName, response.data)
        }
        return response
    } catch (e) {
        return {statusCode: HTTPCode.NetworkError, data: e.message}
    }
}


const putUserInfo = async (encryptedData, iv) => {
    try {
        return await authFetch("/users/miniprogram/userinfo", {encryptedData, iv}, "put", null)
    } catch (e) {
        return {statusCode: HTTPCode.NetworkError, data: e.message}
    }
}


const APIs = {
    Get: (path, data, header, loading) =>
        fetch(path, data, "get", header, loading),
    Post: (path, data, header, loading) =>
        fetch(path, data, "post", header, loading),
    Delete: (path, data, header, loading) =>
        fetch(path, data, "delete", header, loading),
    Put: (path, data, header, loading) =>
        fetch(path, data, "put", header, loading),
    Fetch: fetch,
}

const AuthAPIs = {
    Get: (path, data, header, loading) =>
        authFetch(path, data, "get", header, loading),
    Post: (path, data, header, loading) =>
        authFetch(path, data, "post", header, loading),
    Delete: (path, data, header, loading) =>
        authFetch(path, data, "delete", header, loading),
    Put: (path, data, header, loading) =>
        authFetch(path, data, "put", header, loading),
    Fetch: authFetch
}

module.exports = {
    BaseURL: BaseURL,
    AuthTokenName: AuthTokenName,
    AuthAPIs: AuthAPIs,
    APIs: APIs,
    HTTPCode: HTTPCode,
    Login: login,
    PutUserInfo: putUserInfo
}
