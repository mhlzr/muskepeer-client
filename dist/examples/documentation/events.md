

__THREAD___

{ type: 'result:push', data: { a : 10, b : 'Foo'}}}
{ type: 'result:pull', data: {uuid: '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3'}}}

{ type: 'job:push', data: { a: 10, b: 20, c: 50} }}

{ type: 'job:pull', data: {uuid: 'c25945fcf5508f52661464831d54de84a228bad76a9474222fb2aa1d7a7d5850'}}}
{ type: 'job:pull' });}

{ type: 'file:pull', data: {uri: 'https://dl.dropboxusercontent.com/u/959008/webstorm.pdf'} }}
{ type: 'file:pull', data: {name: 'webstorm'} }}

{ type: 'file:push', data: {} }}


__Peer__

___Internal___
                peers.on('peer:connect', peerConnectedHandler);
                peers.on('peer:message', peerMessageHandler);
                peers.on('peer:disconnect', peerDisconnectHandler);
                peers.on('peer:timeout', peerTimeoutHandler);

___External___
{ type: 'file:list:pull'}
{ type: 'file:list:push', list: list}
{ type: 'file:pull', uuid: uuid}
{ type: 'file:push', uuid: uuid, chunk: chunk, pos: pos}

{ type: 'node:list:pull'}
{ type: 'node:list:push', list: list}
{ type: 'node:pull', uuid: uuid}
{ type: 'node:push', node: node}

{ type: 'peer:list:pull'}
{ type: 'peer:pull', uuid: uuid}
{ type: 'peer:push', peer: peer}
{ type: 'job:list:pull'}
{ type: 'job:list:push', list: list}
{ type: 'job:pull', uuid: uuid}

{ type: 'job:push', job: job}
{ type: 'result:list:pull'}
{ type: 'result:list:push', list: list)}
{ type: 'result:pull', uuid: uuid}
{ type: 'result:push', result: result}


{ type: 'broadcast:result:found, data: data}
{ type: 'broadcast:result:update, data: data}

{ type: 'broadcast:job:lock, data: data}
{ type: 'broadcast:job:unlock, data: data}
{ type: 'broadcast:job:finish, data: data}


__Node__

__External__

___Outgoing___
'peer:auth', {uuid: settings.uuid, location: location}
'peer:offer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, offer: offer, location: location}
'peer:answer', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, answer: answer}
'peer:candidate', {uuid: settings.uuid, targetPeerUuid: targetPeerUuid, candidate: candidate}
'peer:list', {projectUuid: project.uuid}


__Incoming___
('peer:offer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, offer: data.data.offer, location: data.data.location});
('peer:answer', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, answer: data.data.answer});
('peer:candidate', {nodeUuid: self.uuid, targetPeerUuid: data.data.targetPeerUuid, candidate: data.data.candidate});
'peer:list', {projectUuid: project.uuid}, true);
{cmd: 'peer:auth', data: {success: true|false}
