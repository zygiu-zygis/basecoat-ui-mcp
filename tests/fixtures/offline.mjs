// Network tripwire for offline protocol and packed-package integration tests.
import dns from 'node:dns';
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
dns.lookup = denied;
dns.lookupService = denied;
dns.resolve = denied;
dns.resolve4 = denied;
dns.resolve6 = denied;
dns.resolveAny = denied;
dns.resolveCname = denied;
dns.resolveMx = denied;
dns.resolveNaptr = denied;
dns.resolveNs = denied;
dns.resolvePtr = denied;
dns.resolveSoa = denied;
dns.resolveSrv = denied;
dns.resolveTxt = denied;
dns.reverse = denied;
syncBuiltinESMExports();
