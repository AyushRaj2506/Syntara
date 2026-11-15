const { chromium, expect } = require('@playwright/test');
const { io } = require('socket.io-client');
const front = process.env.SYNTARA_TEST_URL || 'https://syntara-hism.onrender.com';
const back = process.env.SYNTARA_TEST_BACKEND || 'https://syntara-server.onrender.com';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const socket=io(back,{transports:['websocket'],timeout:60000,reconnection:false});
 const contexts=[],pages=[],errors=[];
 try {
  await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject)});
  const created=await socket.timeout(15000).emitWithAck('room:create',{name:'Simultaneous typing verification',subject:'General',displayName:'Typing host'});
  if(!created.room)throw Error(JSON.stringify(created.error));
  for(let index=0;index<3;index++){
   const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
   const page=await context.newPage();pages.push(page);page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(({created,index})=>{sessionStorage.setItem('syntara:displayName',`Writer ${index}`);if(!index)sessionStorage.setItem(`syntara:session:${created.room.roomCode}`,created.participantToken)},{created,index});
   await page.goto(`${front}/?room=${created.room.roomCode}`);await expect(page.locator('.notes-editor-content')).toBeVisible({timeout:60000});
  }
  socket.disconnect();
  const host=pages[0], notes=host.locator('.notes-editor-content');
  await notes.fill('paragraph zero');await notes.press('End');await notes.press('Enter');await host.keyboard.insertText('paragraph one');await notes.press('Enter');await host.keyboard.insertText('paragraph two');
  for(const page of pages)await expect(page.locator('.notes-editor-content p')).toHaveCount(3);
  await Promise.all(pages.map(async(page,index)=>{const paragraph=page.locator('.notes-editor-content p').nth(index);await paragraph.click();await page.keyboard.press('End');await page.keyboard.type(` writer${index}-finished`,{delay:45})}));
  for(const page of pages)for(let index=0;index<3;index++)await expect(page.locator('.notes-editor-content')).toContainText(`writer${index}-finished`,{timeout:20000});
  console.log('PASS three users continuously type in notes without replacing peers');
  await Promise.all(pages.map(page=>page.getByRole('tab',{name:'Code',exact:true}).click()));
  await host.getByRole('textbox',{name:'Code editor'}).fill('# first\n# second\n# third');
  for(const page of pages)await expect(page.getByRole('textbox',{name:'Code editor'})).toHaveValue('# first\n# second\n# third');
  await Promise.all(pages.map(async(page,index)=>{const input=page.getByRole('textbox',{name:'Code editor'});await input.focus();await input.press('Control+Home');for(let row=0;row<index;row++)await input.press('ArrowDown');await input.press('End');await input.pressSequentially(` code${index}-finished`,{delay:45})}));
  for(const page of pages)for(let index=0;index<3;index++)await expect(page.getByRole('textbox',{name:'Code editor'})).toHaveValue(new RegExp(`code${index}-finished`),{timeout:20000});
  console.log('PASS three users continuously type in code with stable cursor positions');
  await Promise.all(contexts.map(context=>context.setOffline(true)));
  await Promise.all(pages.map(async(page,index)=>{const input=page.getByRole('textbox',{name:'Code editor'});await input.press('Control+End');await input.pressSequentially(` offline${index}`,{delay:20})}));
  await Promise.all(contexts.map(context=>context.setOffline(false)));
  for(const page of pages)for(let index=0;index<3;index++)await expect(page.getByRole('textbox',{name:'Code editor'})).toHaveValue(new RegExp(`offline${index}`),{timeout:25000});
  await host.reload();await expect(host.locator('.notes-editor-content')).toContainText('writer2-finished');await host.getByRole('tab',{name:'Code',exact:true}).click();await expect(host.getByRole('textbox',{name:'Code editor'})).toHaveValue(/offline2/);
  await expect.poll(async()=>new Set(await Promise.all(pages.map(page=>page.getByRole('textbox',{name:'Code editor'}).inputValue()))).size).toBe(1);
  expect(errors).toEqual([]);console.log('PASS offline edits merge, refresh retains all writers, no browser exceptions');
 }finally{socket.disconnect();for(const page of pages){if(await page.getByRole('button',{name:'Room menu'}).isVisible().catch(()=>false)){await page.getByRole('button',{name:'Room menu'}).click();await page.getByRole('menuitem',{name:'Leave Room'}).click().catch(()=>{});}}for(const context of contexts)await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
