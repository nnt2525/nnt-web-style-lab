import {styles} from './styles.js';
import {connect,api} from './api.js';

const root=document.querySelector('#app');
const style=styles.find(item=>item.slug===document.body.dataset.style);
export function el(tag,className='',text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
let toastTimer;
function notify(message,kind='success'){const toast=document.querySelector('#toast');toast.textContent=message;toast.dataset.kind=kind;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),6500);}

try{
  if(!style)throw new Error('This style could not be found. Return to the gallery.');
  const connection=await connect();
  document.querySelector('#runtime-status').textContent=connection.mode==='server'?'● API + SQLite connected':'○ Read-only preview';
  document.querySelector('#runtime-status').dataset.mode=connection.mode;
  const banner=document.querySelector('#runtime-banner');
  banner.textContent=connection.mode==='server'?'Personal demo workspace · changes are saved in SQLite for this browser. No real payments, emails, or purchases.':'Frontend preview · start the Node server from GitHub to create orders, bookings, tasks, and other records. Data is saved only by the real backend.';
  const app=await import(`./apps/${style.app}.js`);
  root.replaceChildren();
  root.className=`app-${style.app}`;
  await app.mount(root,style,{api,el,notify,mode:connection.mode,bootstrap:connection.bootstrap});
}catch(error){root.replaceChildren(el('div','error-card',error.message));}
