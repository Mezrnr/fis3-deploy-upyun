let upyun = require('upyun');
let fs = require('fs');
let path = require('path');

class Upyun {
    constructor(ops) {
        this.client = this.init(ops);
    }

    init(ops) {
        let service = new upyun.Service(ops.connect.service,ops.connect.operator,ops.connect.password)
        let client = new upyun.Client(service);
        return client;
    }

    list(remotePath, options = {}) {
        return this.client
            .listDir(remotePath, options)
            .then(lists => {
                console.log('list file:', lists);
                return Promise.resolve(lists)
            })
            .catch(error => console.log('list error:', error))
    }

    put(remotePath, context) {
        return this.client
            .putFile(remotePath, context)
            .catch(error => console.log('list error:', error))
    }

    del(remotePath) {
        this.client
            .deleteFile(remotePath)
            .then((res) => {
                console.log('delete File:', res)
            })
            .catch(error => console.log('delete error:', error));
    }

    had(remotePath) {
        return this.client
            .headFile(remotePath)
            .then(res => {
                return Promise.resolve(res);
            })
            .catch(error => console.log('had error:', error))
    }

}

module.exports = Upyun;