import {styles,appNames} from './styles.js';
const grid=document.querySelector('#style-grid');
const search=document.querySelector('#search');
const application=document.querySelector('#app-filter');
let group='All directions';
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
for(const [key,name]of Object.entries(appNames))application.append(new Option(name,key));
const groups=['All directions',...new Set(styles.map(style=>style.group))];
for(const name of groups){const button=el('button','',name);button.type='button';button.setAttribute('aria-pressed',String(name===group));button.addEventListener('click',()=>{group=name;document.querySelectorAll('#group-filters button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();});document.querySelector('#group-filters').append(button);}
function thumbnail(style){
  const art=el('div',`style-thumbnail thumbnail-${style.group}`);art.setAttribute('aria-hidden','true');
  art.style.setProperty('--tile-bg',style.colors[0]);art.style.setProperty('--tile-ink',style.colors[1]);art.style.setProperty('--tile-accent',style.colors[2]);
  const top=el('div','tile-top');top.append(el('span','',style.brand),el('span','',appNames[style.app].toUpperCase()));art.append(top,el('div','tile-display',style.headline),el('span','tile-caption',style.group.toUpperCase()+' / NNT_DEV'));
  if(style.app==='commerce'){const chair=el('div','drawn-chair tile-chair');for(let i=0;i<4;i++)chair.append(el('i'));art.append(chair);}
  else if(style.app==='tasks'||style.app==='ai'){const ui=el('div','tile-ui');for(let i=0;i<3;i++)ui.append(el('div'));art.append(ui);}
  else if(style.app==='analytics'){const bars=el('div','tile-lines');for(let i=0;i<7;i++)bars.append(el('i'));art.append(bars);}
  else if(style.app==='journal'||style.app==='learning'){art.append(el('div','tile-book',style.app==='journal'?'READ / THINK / REPEAT':'A LITTLE MORE CURIOUS.'));}
  else if(style.app==='studio'){art.append(el('div','tile-cube'));}
  else{const dots=el('div','tile-dot-grid');for(let i=0;i<9;i++)dots.append(el('i'));art.append(dots);}
  return art;
}
function render(){
  const needle=search.value.trim().toLowerCase();
  const visible=styles.filter(style=>(group==='All directions'||style.group===group)&&(application.value==='all'||style.app===application.value)&&`${style.name} ${style.brand} ${style.app} ${style.description}`.toLowerCase().includes(needle));
  grid.replaceChildren(...visible.map(style=>{
    const card=el('a','style-card');card.href=`demos/${style.slug}/`;card.setAttribute('aria-label',`Open ${style.name}: ${style.brand}`);
    const content=el('div','style-card-content');content.append(el('span','style-category',`${style.group} / ${style.brand}`),el('h3','',style.name),el('p','',style.description));
    const bottom=el('div','card-bottom'),swatches=el('div','color-swatches');
    for(const color of style.colors){const dot=el('i');dot.style.background=color;swatches.append(dot);}
    bottom.append(el('span','',appNames[style.app]),swatches,el('b','card-arrow','↗'));content.append(bottom);card.append(thumbnail(style),content);return card;
  }));
  document.querySelector('#result-count').textContent=`${visible.length} of 49 experiments`;
  document.querySelector('#empty-gallery').hidden=visible.length>0;
}
search.addEventListener('input',render);application.addEventListener('change',render);render();
