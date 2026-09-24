// Network tripwire for the stdio protocol integration test.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';

function denied() {
  process.stderr.write('OFFLINE_NETWORK_ATTEMPT\n');
  throw new Error('Network access is forbidden in the offline protocol test.');
}

globalThis.fetch = denied;
http.request = http.get = denied;
https.request = https.get = denied;
net.connect = net.createConnection = denied;
net.Socket.prototype.connect = denied;
tls.connect = denied;
syncBuiltinESMExports();
