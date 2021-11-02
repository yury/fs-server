import Channel from './channel';
import { URI } from 'vscode-uri';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';



export enum FileType {
	Unknown = 0,
	File = 1,
	Directory = 2,
	SymbolicLink = 64,
}

type FileStat = {
	type: FileType,
	size: number,
	mtime: number,
	ctime: number
}

function toFileType(stat: fs.Stats): FileType {

	if (stat.isSymbolicLink()) {
		return FileType.SymbolicLink | (stat.isDirectory() ? FileType.Directory : FileType.File);		
	} 

	return stat.isFile() ? FileType.File : stat.isDirectory() ? FileType.Directory : FileType.Unknown;		
}

function toFileStat(stat: fs.Stats): FileStat {

	return {
		type: toFileType(stat),
		size: stat.size,
		ctime: stat.ctime.getTime(),
		mtime: stat.mtime.getTime()
	}

}

type GetRootBody = {
	op: "getRoot",
	token: number,
	version: number
}

type StatBody = {
	op: "stat",
	uri: string
}

type ReadDirectoryBody = {
	op: "readDirectory",
	uri: string
}

type ReadFileBody = {
	op: "readFile",
	uri: string
}

type WriteFileBody = {
	op: "writeFile",
	uri: string,
	options: {create: boolean; overwrite: boolean;}
}
type RenameBody = {
	op: "rename",
	oldUri: string,
	newUri: string,
	options: {overwrite: boolean;}
}

type RequestBody = StatBody | ReadDirectoryBody | ReadFileBody | WriteFileBody | RenameBody | GetRootBody


export default class FSProvider {
	_channel: Channel;
	_root: string;
	constructor(channel: Channel, root: string) {
		this._root = root;
		this._channel = channel;
		channel.onRequest = this._requestHandler;
	}


	_requestHandler = async (body:RequestBody, data: Uint8Array | null): Promise<{body: {}, data: Uint8Array | null}> => {
		console.log(body);
		switch (body.op) {
			case "getRoot":
				return this._getRoot(body.token, body.version);
			case "stat":
				return this._stat(body.uri);
			case "readDirectory":
				return this._readDirectory(body.uri);
			case "readFile":
				return this._readFile(body.uri);
			case "writeFile":
				return this._writeFile(body.uri, data, body.options);
			case "rename":
				return this._rename(body.oldUri, body.newUri, body.options);
		}
		return {body: {hello: "world"}, data: null};
	}

	async _getRoot(token: number, version: number): Promise<{body: {}, data: null}> {
		return {
			body: {name: "nice", root: "blink-fs:/Users/yury"},
			data: null
		}
	}

	async _rename(oldUri: string, newUri: string, options: { overwrite: boolean }): Promise<{body: {}, data: null}> {
		throw Error('nice');
	}

	//stat(uri: URI): vscode.FileStat | Thenable<vscode.FileStat> {
	async _stat(uri: string): Promise<{body: FileStat, data: null}> {
		console.log("_stat", uri);
		let url = URI.parse(uri);
		return this.__stat(url.fsPath);
	}

	async __stat(path: string): Promise<{body: FileStat, data: null}> {
		let stat = await fsp.stat(path);

		return {
			body: toFileStat(stat),
			data: null
		}
	}

        //readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
	async _readDirectory(uri: string): Promise<{body: [string, FileType][], data: null}> {
		let url = URI.parse(uri)

		let root = url.fsPath;// path.join(this._root, url.fsPath);
		console.log('root', root);
		console.log('fsPath', url.fsPath);

		const children = await fsp.readdir(root);

		const result: [string, FileType][] = [];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			console.log(path.join(root, child));
			let fullChild = path.join(root, child);
			const stat = await this.__stat(fullChild);
			result.push([child, stat.body.type]);
		}

		return {
			body: result,
			data: null
		}

	}

	//readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
	//       return _.readfile(uri.fsPath);
	//  }
	async _readFile(uri: string): Promise<{body: {}, data: Uint8Array}> {
		let url = URI.parse(uri);
		console.log('readFile', uri);
		let buf = await fsp.readFile(url.fsPath);
		return {
			body: {},
			data: buf
		}
	}

	async _writeFile(uri: string, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<{body: {}, data: null}> {
		let url = URI.parse(uri);
		var exists: boolean;
		try {
			await fsp.access(url.fsPath, fs.constants.R_OK | fs.constants.W_OK );
			exists = true;
		} catch {
			exists = false;
		}
		if (!exists) {
			if (!options.create) {
				throw "FileNotFound";// vscode.FileSystemError.FileNotFound();
			}

			await fsp.mkdir(path.dirname(url.fsPath));
		} else {
			if (!options.overwrite) {
				throw "FileExists";// vscode.FileSystemError.FileExists();
			}
		}

		await fsp.writeFile(url.fsPath, content as Buffer);
		return {body: {}, data: null}
	}



}
