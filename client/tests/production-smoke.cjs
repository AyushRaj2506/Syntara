const { chromium } = require('@playwright/test');
const { io } = require('socket.io-client');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const socket = io('https://syntara-server.onrender.com', { transports: ['websocket'], timeout: 60000, reconnection: false });
 let page;
 try {
  await new Promise((resolve,reject) => { socket.once('connect',resolve);socket.once('connect_error',reject); });
  const created = await socket.timeout(20000).emitWithAck('room:create',{name:'Release verification',subject:'General',displayName:'Release tester'});
  assert.ok(created.room,JSON.stringify(created.error));
  const errors=[];
  const context=await browser.newContext({viewport:{width:1440,height:950}});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({room,participantToken})=>{sessionStorage.setItem('syntara:displayName','Release tester');sessionStorage.setItem(`syntara:session:${room.roomCode}`,participantToken);},created);
  const url=`https://syntara-hism.onrender.com/?room=${created.room.roomCode}`;
  await page.goto(url);await page.locator('.notes-editor-content').waitFor({timeout:60000});socket.disconnect();console.log('PASS room entry');
  const pc=await browser.newContext({viewport:{width:1440,height:950}});const peer=await pc.newPage();
  await peer.addInitScript(()=>sessionStorage.setItem('syntara:displayName','Release peer'));
  await peer.goto(url);await peer.locator('.notes-editor-content').waitFor({timeout:60000});
  await page.locator('.notes-editor-content').fill('Production synchronization verified');
  await peer.locator('.notes-editor-content').filter({hasText:'Production synchronization verified'}).waitFor({timeout:20000});
  await page.reload();await page.locator('.notes-editor-content').filter({hasText:'Production synchronization verified'}).waitFor();console.log('PASS notes and refresh');
  await page.getByRole('button',{name:'Start Focus',exact:true}).click();
  for(const name of ['Pause focus session','Resume focus session','End focus session','New Sprint']) await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('textbox',{name:'Chat message'}).fill('Production chat check');await page.getByRole('button',{name:'Send message'}).click();await peer.getByText('Production chat check',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Quiz',exact:true}).click();await page.getByRole('heading',{name:'Create a Quiz'}).waitFor();console.log('PASS focus, chat, quiz entry');
  await peer.getByRole('button',{name:'Room menu'}).click();await peer.getByRole('menuitem',{name:'Leave Room'}).click();
  await page.getByRole('button',{name:'Attach and share file'}).click();await page.locator('input[type=file]').setInputFiles({name:'release-check.txt',mimeType:'text/plain',buffer:Buffer.from('Release verification')});await page.getByRole('button',{name:'Send File',exact:true}).click();
  const link=page.getByRole('link',{name:'Download release-check.txt'});await link.waitFor({timeout:30000});const href=await link.getAttribute('href');assert.equal(await(await page.request.get(href)).text(),'Release verification');
  await page.setViewportSize({width:390,height:844});await page.getByRole('navigation',{name:'Room navigation'}).getByRole('button',{name:'Notes',exact:true}).click();assert.equal(await page.locator('.notes-editor-content').count(),1);console.log('PASS fallback upload and mobile');
  await page.getByRole('button',{name:'Room menu'}).click();await page.getByRole('menuitem',{name:'Leave Room'}).click();assert.equal((await page.request.get(href)).status(),404);assert.deepEqual(errors,[]);console.log('PASS cleanup, expired file, no browser errors');
 } finally { socket.disconnect();if(page) { try { console.log('Final URL',page.url()); }catch{} }await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
