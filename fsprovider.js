"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.FileType = void 0;
var vscode_uri_1 = require("vscode-uri");
var fsp = require("fs/promises");
var fs = require("fs");
var path = require("path");
var FileType;
(function (FileType) {
    FileType[FileType["Unknown"] = 0] = "Unknown";
    FileType[FileType["File"] = 1] = "File";
    FileType[FileType["Directory"] = 2] = "Directory";
    FileType[FileType["SymbolicLink"] = 64] = "SymbolicLink";
})(FileType = exports.FileType || (exports.FileType = {}));
function toFileType(stat) {
    if (stat.isSymbolicLink()) {
        return FileType.SymbolicLink | (stat.isDirectory() ? FileType.Directory : FileType.File);
    }
    return stat.isFile() ? FileType.File : stat.isDirectory() ? FileType.Directory : FileType.Unknown;
}
function toFileStat(stat) {
    return {
        type: toFileType(stat),
        size: stat.size,
        ctime: stat.ctime.getTime(),
        mtime: stat.mtime.getTime()
    };
}
var FSProvider = /** @class */ (function () {
    function FSProvider(channel, root) {
        var _this = this;
        this._requestHandler = function (body, data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log(body);
                switch (body.op) {
                    case "getRoot":
                        return [2 /*return*/, this._getRoot(body.token, body.version)];
                    case "stat":
                        return [2 /*return*/, this._stat(body.uri)];
                    case "readDirectory":
                        return [2 /*return*/, this._readDirectory(body.uri)];
                    case "readFile":
                        return [2 /*return*/, this._readFile(body.uri)];
                    case "writeFile":
                        return [2 /*return*/, this._writeFile(body.uri, data, body.options)];
                    case "rename":
                        return [2 /*return*/, this._rename(body.oldUri, body.newUri, body.options)];
                }
                return [2 /*return*/, { body: { hello: "world" }, data: null }];
            });
        }); };
        this._root = root;
        this._channel = channel;
        channel.onRequest = this._requestHandler;
    }
    FSProvider.prototype._getRoot = function (token, version) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        body: { name: "nice", root: "blink-fs:/Users/yury" },
                        data: null
                    }];
            });
        });
    };
    FSProvider.prototype._rename = function (oldUri, newUri, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw Error('nice');
            });
        });
    };
    //stat(uri: URI): vscode.FileStat | Thenable<vscode.FileStat> {
    FSProvider.prototype._stat = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                console.log("_stat", uri);
                url = vscode_uri_1.URI.parse(uri);
                return [2 /*return*/, this.__stat(url.fsPath)];
            });
        });
    };
    FSProvider.prototype.__stat = function (path) {
        return __awaiter(this, void 0, void 0, function () {
            var stat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fsp.stat(path)];
                    case 1:
                        stat = _a.sent();
                        return [2 /*return*/, {
                                body: toFileStat(stat),
                                data: null
                            }];
                }
            });
        });
    };
    //readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    FSProvider.prototype._readDirectory = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var url, root, children, result, i, child, fullChild, stat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = vscode_uri_1.URI.parse(uri);
                        root = url.fsPath;
                        console.log('root', root);
                        console.log('fsPath', url.fsPath);
                        return [4 /*yield*/, fsp.readdir(root)];
                    case 1:
                        children = _a.sent();
                        result = [];
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < children.length)) return [3 /*break*/, 5];
                        child = children[i];
                        console.log(path.join(root, child));
                        fullChild = path.join(root, child);
                        return [4 /*yield*/, this.__stat(fullChild)];
                    case 3:
                        stat = _a.sent();
                        result.push([child, stat.body.type]);
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, {
                            body: result,
                            data: null
                        }];
                }
            });
        });
    };
    //readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    //       return _.readfile(uri.fsPath);
    //  }
    FSProvider.prototype._readFile = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var url, buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = vscode_uri_1.URI.parse(uri);
                        console.log('readFile', uri);
                        return [4 /*yield*/, fsp.readFile(url.fsPath)];
                    case 1:
                        buf = _a.sent();
                        return [2 /*return*/, {
                                body: {},
                                data: buf
                            }];
                }
            });
        });
    };
    FSProvider.prototype._writeFile = function (uri, content, options) {
        return __awaiter(this, void 0, void 0, function () {
            var url, exists, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        url = vscode_uri_1.URI.parse(uri);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fsp.access(url.fsPath, fs.constants.R_OK | fs.constants.W_OK)];
                    case 2:
                        _b.sent();
                        exists = true;
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        exists = false;
                        return [3 /*break*/, 4];
                    case 4:
                        if (!!exists) return [3 /*break*/, 6];
                        if (!options.create) {
                            throw "FileNotFound"; // vscode.FileSystemError.FileNotFound();
                        }
                        return [4 /*yield*/, fsp.mkdir(path.dirname(url.fsPath))];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        if (!options.overwrite) {
                            throw "FileExists"; // vscode.FileSystemError.FileExists();
                        }
                        _b.label = 7;
                    case 7: return [4 /*yield*/, fsp.writeFile(url.fsPath, content)];
                    case 8:
                        _b.sent();
                        return [2 /*return*/, { body: {}, data: null }];
                }
            });
        });
    };
    return FSProvider;
}());
exports["default"] = FSProvider;
