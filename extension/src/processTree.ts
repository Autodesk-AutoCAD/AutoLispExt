// $ts: processTree.ts#2 $ $Change: 385917 $ $DateTime: 2018/12/05 11:52:14 $ $Author: yunjian.zhang $
// $NoKeywords: $
//
//  Copyright 2018 Autodesk, Inc.  All rights reserved.
//
//  Use of this software is subject to the terms of the Autodesk license 
//  agreement provided at the time of installation or download, or which 
//  otherwise accompanies this software in either electronic or hard copy form.   
//
// processTree.ts
//
// CREATED BY:  yunjian.zhang               DECEMBER. 2018
//
// DESCRIPTION: Lisp vscode extension core code.
//
'use strict';

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import * as _ from 'lodash';

import { ProcessPathCache } from "./processCache";

export function getProcesses(one: (pid: number, ppid: number, command: string, args: string, exepath: string, date?: number) => void) : Promise<void> {

	function lines(callback: (a: string) => void) {
		let unfinished = '';
		return (data: string | Buffer) => {
			const lines = data.toString().split(/\r?\n/);
			const finishedLines = lines.slice(0, lines.length - 1);
			finishedLines[0] = unfinished + finishedLines[0];
			unfinished = lines[lines.length - 1];
			for (const s of finishedLines) {
				callback(s);
			}
		};
	}

	return new Promise((resolve, reject) => {

		let proc: ChildProcess;

		if (process.platform === 'win32') {
			let nameClause = undefined;
			if(ProcessPathCache.globalAcadNameInUserAttachConfig)
				nameClause = 'name like \'' + ProcessPathCache.globalAcadNameInUserAttachConfig +'%\'';
			else
				nameClause = 'name like \'acad%\'';

			const CMD_PAT = /^(.*)\s+([0-9]+)\.[0-9]+[+-][0-9]+\s+(.*)\s+([0-9]+)\s+([0-9]+)$/;
			//const CMD_PAT = /^(.*)\s+([0-9]+)\.[0-9]+[+-][0-9]+\s+([0-9]+)\s+([0-9]+)$/;
			const wmic = join(process.env['WINDIR'] || 'C:\\Windows', 'System32', 'wbem', 'WMIC.exe');
			proc = spawn(wmic, [ 'process', 'where', nameClause, 'get', 'CommandLine,CreationDate,ExecutablePath,ParentProcessId,ProcessId' ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {
				//let matches = _.compact(line.trim().split(' '));
				let matches = CMD_PAT.exec(line.trim());
				if (matches && matches.length === 6) {
					const pid = Number(matches[5]);
					const ppid = Number(matches[4]);
					const exepath = matches[3].trim();
					const date = Number(matches[2]);
					let args = matches[1].trim();
					if (!isNaN(pid) && !isNaN(ppid) && args) {
						let command = args;
						if (args[0] === '"') {
							const end = args.indexOf('"', 1);
							if (end > 0) {
								command = args.substr(1, end-1);
								args = args.substr(end + 2);
							}
						} else {
							const end = args.indexOf(' ');
							if (end > 0) {
								command = args.substr(0, end);
								args = args.substr(end + 1);
							} else {
								args = '';
							}
						}
						one(pid, ppid, command, args, exepath, date);
					}
				}
			}));

		} else if (process.platform === 'darwin') {	// OS X

			proc = spawn('/bin/ps', [ '-x', '-o', `pid,ppid,comm=${'a'.repeat(256)},command` ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {

				const pid = Number(line.substr(0, 5));
				const ppid = Number(line.substr(6, 5));
				const command = line.substr(12, 256).trim();
				const args = line.substr(269 + command.length);

				if (!isNaN(pid) && !isNaN(ppid)) {
					one(pid, ppid, command, args, command);
				}
			}));

		} else {	// linux

			proc = spawn('/bin/ps', [ '-ax', '-o', 'pid,ppid,comm:20,command' ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {

				const pid = Number(line.substr(0, 5));
				const ppid = Number(line.substr(6, 5));
				let command = line.substr(12, 20).trim();
				let args = line.substr(33);

				let pos = args.indexOf(command);
				if (pos >= 0) {
					pos = pos + command.length;
					while (pos < args.length) {
						if (args[pos] === ' ') {
							break;
						}
						pos++;
					}
					command = args.substr(0, pos);
					args = args.substr(pos + 1);
				}

				if (!isNaN(pid) && !isNaN(ppid)) {
					one(pid, ppid, command, args, command);
				}
			}));
		}

		proc.on('error', err => {
			reject(err);
		});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', data => {
			reject(new Error(data.toString()));
		});

		proc.on('close', (code, signal) => {
			if (code === 0) {
				resolve();
			} else if (code > 0) {
				reject(new Error(`process terminated with exit code: ${code}`));
			}
			if (signal) {
				reject(new Error(`process terminated with signal: ${signal}`));
			}
		});

		proc.on('exit', (code, signal) => {
			if (code === 0) {
				//resolve();
			} else if (code > 0) {
				reject(new Error(`process terminated with exit code: ${code}`));
			}
			if (signal) {
				reject(new Error(`process terminated with signal: ${signal}`));
			}
		});
	});
}