import { convertVlessToClashProxy, convertHysteria2ToClashProxy } from './convert.js';

const common = ['sni', 'allowInsecure', 'insecure', 'alpn'];
const vlessKeys = [...common, 'type', 'network', 'security', 'encryption', 'packetEncoding', 'packet-encoding', 'serverName', 'servername', 'fp', 'fingerprint', 'pbk', 'publicKey', 'sid', 'shortId', 'flow', 'host', 'path', 'serviceName', 'service-name', 'ed', 'eh', 'mode'];
const hyKeys = [...common, 'peer', 'obfs', 'obfs-password', 'obfsParam', 'upmbps', 'up', 'downmbps', 'down', 'pinSHA256', 'pin-sha256'];
const controls = /[\x00-\x1f\x7f]/;
function reject(field) { throw new Error(`节点字段无效或不受支持：${field}`); }

// Validate before persistence; converters remain tolerant of legacy stored links.
export function validateNodeLink(link) {
  if (typeof link !== 'string' || /\s/.test(link) || /%(?![\da-f]{2})/i.test(link)) reject('链接格式');
  let url;
  try { decodeURIComponent(link); url = new URL(link); } catch { reject('链接格式'); }
  const vless = url.protocol.toLowerCase() === 'vless:';
  if (!vless && url.protocol.toLowerCase() !== 'hysteria2:') reject('协议');
  if (!url.hostname || url.pathname && url.pathname !== '/') reject('服务器地址');
  if (!url.port || !/^[0-9]+$/.test(url.port) || +url.port < 1 || +url.port > 65535) reject('端口（必填，1–65535）');
  const host = url.hostname;
  if (!host.startsWith('[') && (!/^[a-z0-9._-]+$/i.test(host) || host.includes('..'))) reject('服务器地址');
  let user, pass;
  try { user = decodeURIComponent(url.username); pass = decodeURIComponent(url.password); decodeURIComponent(url.hash); } catch { reject('字符编码'); }
  if (!user || controls.test(user + pass)) reject('身份凭据');
  if (vless && (pass || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(user))) reject('UUID');
  const q = url.searchParams;
  const allowed = new Set(vless ? vlessKeys : hyKeys);
  for (const [key, value] of q) {
    if (!allowed.has(key) || q.getAll(key).length !== 1 || controls.test(value)) reject(key);
  }
  for (const aliases of [['type','network'], ['sni','peer'], ['sni','serverName','servername'], ['fp','fingerprint'], ['pbk','publicKey'], ['sid','shortId'], ['up','upmbps'], ['down','downmbps'], ['obfs-password','obfsParam'], ['serviceName','service-name'], ['packetEncoding','packet-encoding'], ['allowInsecure','insecure'], ['pinSHA256','pin-sha256']]) {
    if (aliases.filter(k => q.has(k)).length > 1) reject(aliases[0]);
  }
  for (const key of ['allowInsecure', 'insecure']) if (q.has(key) && !/^(0|1|true|false|yes|no)$/i.test(q.get(key))) reject(key);
  for (const key of ['sni','peer','serverName','servername','host']) if (q.has(key) && /[\s\/\\@]/.test(q.get(key))) reject(key);
  if (vless) {
    const network = q.get('type') || q.get('network') || 'tcp';
    const security = q.get('security') || 'none';
    if (!['tcp','ws','grpc','http','h2','xhttp'].includes(network)) reject('传输类型');
    if (!['none','tls','reality'].includes(security)) reject('安全模式');
    if (security === 'none' && ['sni','serverName','servername','fp','fingerprint','alpn','allowInsecure','insecure'].some(key => q.has(key))) reject('TLS 参数需要安全模式');
    if ((q.has('path') || q.has('host')) && !['ws','http','h2','xhttp'].includes(network)) reject('传输路径或 Host');
    if (q.has('eh') && (!q.has('ed') || !q.get('eh'))) reject('early-data header');
    if (q.has('encryption') && q.get('encryption') !== 'none') reject('encryption');
    if (security === 'reality') {
      if (!/^[\w-]{43}$/.test(q.get('pbk') || q.get('publicKey') || '')) reject('Reality 公钥');
      const sid = q.get('sid') || q.get('shortId') || '';
      if (!/^(?:[\da-f]{2}){0,8}$/i.test(sid)) reject('Reality short-id');
    } else if (q.has('pbk') || q.has('publicKey') || q.has('sid') || q.has('shortId')) reject('Reality 参数');
    if (q.has('flow') && q.get('flow') !== 'none' && (q.get('flow') !== 'xtls-rprx-vision' || network !== 'tcp' || security === 'none')) reject('flow');
    if (q.has('mode') && (network !== 'xhttp' || !['auto','stream-one','stream-up','packet-up'].includes(q.get('mode')))) reject('XHTTP mode');
    if ((q.has('ed') || q.has('eh')) && network !== 'ws') reject('WebSocket 参数');
    if (q.has('ed') && (!/^\d+$/.test(q.get('ed')) || +q.get('ed') < 1 || +q.get('ed') > 65535)) reject('ed');
    if ((q.has('serviceName') || q.has('service-name')) && network !== 'grpc') reject('gRPC 参数');
    if (q.has('packetEncoding') || q.has('packet-encoding')) if (!['xudp','packetaddr'].includes(q.get('packetEncoding') || q.get('packet-encoding'))) reject('packet-encoding');
  } else {
    const obfs = q.get('obfs') || 'none';
    if (!['none', 'salamander'].includes(obfs)) reject('obfs');
    if (obfs === 'salamander' && !(q.get('obfs-password') || q.get('obfsParam'))) reject('obfs-password');
    if (obfs === 'none' && (q.has('obfs-password') || q.has('obfsParam'))) reject('obfs');
    for (const key of ['up','upmbps','down','downmbps']) if (q.has(key) && (!/^\d+(?:\.\d+)?$/.test(q.get(key)) || +q.get(key) <= 0 || !Number.isFinite(+q.get(key)))) reject(key);
  }
  if (q.has('alpn') && !/^[A-Za-z0-9.\/-]+(?:,[A-Za-z0-9.\/-]+)*$/.test(q.get('alpn'))) reject('alpn');
  const proxy = vless ? convertVlessToClashProxy(link) : convertHysteria2ToClashProxy(link);
  if (!proxy) reject('节点配置');
  return proxy;
}
