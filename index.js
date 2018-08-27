let fs = require('fs');
let path = require('path');
let async = require('async');

let Upyun = require('./upyun');

let ProgressBar = require('./progress_bar');



module.exports = (options, modified, total, callback) => {
    console.log('\n')
    console.time("上传时间".green);

    options.remoteDir = options.remoteDir || '/';

    let upyunClient = new Upyun(options);
    let pb = new ProgressBar('上传进度', 50)

    let ftpCache = fileCache(options);
    let files = modified.length == 0 ? total : modified;
    let uploadFiles = options.cache ? ftpCache.filter(files) : files;
    let uploadTotal = uploadFiles.length;
    let uploadCount = 0;
    let progressCount = 0;
    let errorFile = [];
    
    if(uploadTotal == 0){
        console.log('有0个文件需要上传'.green);
        return;
    }

    let cb = () => {
        progressCount++;
        pb.render({
            completed: progressCount,
            total: uploadFiles.length
        });
        if (uploadTotal == uploadCount) {
            console.log(
                '上传文件:'.green + ' ' + uploadTotal.toString().blue + ' file upload '.cyan + (uploadFiles.length - errorFile.length - uploadTotal) + ' 个文件远程已存在'
            );
            // if (errorFile.length > 0) {
                console.log(errorFile.length + '个文件上传失败:'.red, errorFile)
            // }
            console.timeEnd("上传时间".green);
        }
    }

    let debuglog = (info) => {
        if (options.console) {
            console.info(info);
            console.info(' ');
        }
    }

    async.eachLimit(uploadFiles, 1, (file, asyncCallback) => {
        let remotePath = path.posix.join(options.remoteDir, file.getHashRelease());
        upyunClient.had(remotePath).then(res => {
            if (!!res) {
                uploadTotal--;
                debuglog(`该文件已上传:${remotePath}`.cyan);
                cb();
            } else {
                upyunClient.put(remotePath, new Buffer(file.getContent())).then(res => {
                    uploadCount++;
                    if (res) {
                        debuglog(`上传成功:${remotePath}`.green);
                    } else {
                        debuglog(`上传失败:${remotePath}`.red);
                        errorFile.push(remotePath);
                    }
                    cb();
                })
            }
        })
        asyncCallback();
    })
}


// 缓存文件
function fileCache(opts) {
    let gitHEAD = fs.readFileSync(path.join(fis.project.getProjectPath(), opts.rootDir, '.git/HEAD'), 'utf-8').trim() // ref: refs/heads/develop
    let ref = gitHEAD.split(': ')[1] // refs/heads/develop
    let gitBranchName = gitHEAD.split('/')[2] // 环境：eg:develop


    let tmpPath = fis.project.getProjectPath() + path.sep + 'fis3_deploy_ftp' + path.sep + parsePath(opts.connect.host + ':' + opts.connect.port),
        jsonPath = tmpPath + path.sep + parsePath(opts.remoteDir) + gitBranchName + '_sourcemap.json',
        defaultPath = tmpPath + path.sep + parsePath(opts.remoteDir) + 'master_sourcemap.json';

    // fis.log.debug('tmpPath: %s', jsonPath);

    var cache = {};
    if (fis.util.isFile(jsonPath)) {
        if (opts.cache) {
            cache = fis.util.readJSON(jsonPath);
        } else {
            fis.util.del(jsonPath);
        }
    } else if (fis.util.isFile(defaultPath)) {
        if (opts.cache) {
            cache = fis.util.readJSON(defaultPath);
        }
    }

    function filter(files) {
        var result = [];
        files.forEach(function (file) {
            var id = file.getId(),
                hash = file.getHash();

            // fis.log.debug('%s : %s', id, hash);
            if (!cache[id] || cache[id] != hash) {
                cache[id] = hash;
                result.push(file);
            }
        });

        if (result.length > 0) save();

        return result;
    }

    function parsePath(path) {
        if (!path) return '';
        return path.replace(/^\/+/, '').replace(/\/\/(.*):(.*)@/, '').replace(/[:\/\\\.-]+/g, '_');
    }

    function save() {
        fis.util.write(jsonPath, JSON.stringify(cache, null, 4));
    }

    return {
        filter: filter
    };
}