const labels={account:'Account access',billing:'Billing',delivery:'Delivery',technical:'Technical support'};
const samples=[['Payment question','I was charged twice for my order and need a refund.'],['แอปมีปัญหา','แอปเปิดไม่ได้ หน้าจอค้างตลอด'],['Login help','I forgot my password and cannot sign in.'],['Unfamiliar input','🦄🦄🦄🦄']];

export async function mount(root,style,ctx){
  const {el,api,notify}=ctx;
  const header=el('header','app-header');
  const brand=el('a','app-brand',style.brand);brand.href='../../';
  header.append(brand,el('span','pill','BILINGUAL MODEL / TH + EN'));
  const wrap=el('div','ai-wrap');
  const intro=el('section','ai-intro');
  const copy=el('div');copy.append(el('p','eyebrow','A SMALL MODEL. A REAL SERVER.'),el('h1','',style.headline),el('p','muted',style.description),el('p','ai-thai','พิมพ์ข้อความไทยหรืออังกฤษ แล้วตรวจวิธีที่โมเดลจัดแยกคำร้อง ผ่าน API ฝั่ง server'));
  const circuit=el('div','ai-circuit');circuit.setAttribute('aria-hidden','true');circuit.append(el('span','ai-input-node','A CUSTOMER MESSAGE'),el('i','ai-connector','↓'),el('strong','ai-node','↳'),el('i','ai-connector','↓'));
  const queues=el('div','ai-queues');for(const label of Object.values(labels))queues.append(el('span','',label));circuit.append(queues);
  intro.append(copy,circuit);
  const grid=el('div','ai-grid');
  const compose=el('section','card ai-compose');compose.append(el('p','eyebrow','01 / THE MESSAGE'),el('h2','','What needs sorting?'));
  const form=el('form');const field=el('label','field','Your support message');
  const input=el('textarea');input.name='text';input.rows=5;input.required=true;input.maxLength=1000;input.placeholder='e.g. My parcel has not arrived yet.';field.append(input);
  const help=el('div','ai-input-help');const counter=el('span','','0 / 1000');help.append(el('span','','Processed by this app’s Node backend.'),counter);
  input.addEventListener('input',()=>{counter.textContent=`${input.value.length} / 1000`;});
  const submit=el('button','btn','Classify message ↗');submit.type='submit';form.append(field,help,submit);
  const examples=el('div','ai-examples');for(const [name,text]of samples){const button=el('button','btn-secondary',name);button.type='button';button.addEventListener('click',()=>{input.value=text;input.dispatchEvent(new Event('input'));input.focus();});examples.append(button);}
  compose.append(form,el('p','ai-example-label','TRY AN EXAMPLE'),examples,el('p','ai-note','This is a four-queue classifier, not a chatbot. No support actions, payments, or emails are executed.'));
  const result=el('section','card ai-result');result.setAttribute('aria-live','polite');result.append(el('p','eyebrow','02 / THE PREDICTION'),el('div','ai-empty-icon','↳'),el('h2','','Ready when you are.'),el('p','muted','The API returns a class distribution, known-pattern coverage, and an abstention decision.'));
  grid.append(compose,result);
  const evidence=el('section','ai-evidence');evidence.append(el('p','eyebrow','A SCORE IS NOT A GUARANTEE'),el('h2','','Keep the limitations in view.'));
  const metrics=el('div','ai-metrics');
  for(const [title,value,note]of [['Training examples','96','Authored educational messages'],['Closed-set test F1','1.00','Only 32 small synthetic test messages'],['Unfamiliar requests rejected','3 / 6','Half of the unknown tests were false accepts']]){const item=el('div','card');item.append(el('span','',title),el('strong','',value),el('small','',note));metrics.append(item);}
  evidence.append(metrics,el('p','ai-note','The model is character 2–4-gram Multinomial Naive Bayes. Its scores are uncalibrated and can be overconfident. Real-world performance has not been established. History is stored only in your demo workspace; use sample text.'));
  const history=el('section','ai-history');history.append(el('h2','','Your recent experiments'));
  const list=el('div','ai-history-list');history.append(list);
  const renderHistory=async()=>{try{const data=await api(`/classifications?style=${style.slug}`);list.replaceChildren(...(data.classifications.length?data.classifications.slice(0,10).map(item=>{const record=el('article','card ai-history-item');record.append(el('span','pill',item.abstained?'Review needed':labels[item.label]||item.label),el('p','',item.text));return record;}):[el('p','empty-state','No saved predictions yet. Run a message through the API to start a history.')]));}catch(error){list.replaceChildren(el('p','inline-error',error.message));}};
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;
    try{
      const {classification}=await api('/classify',{method:'POST',body:{style:style.slug,text:input.value}});
      result.replaceChildren(el('p','eyebrow',classification.abstained?'MODEL ABSTAINED / REVIEW NEEDED':'02 / PREDICTED QUEUE'),el('h2','',classification.abstained?'A human look would help.':labels[classification.label]||classification.label));
      const bars=el('div','ai-score-list');
      for(const item of classification.scores){const row=el('div','ai-score-row');const meta=el('div');meta.append(el('span','',labels[item.label]),el('b','',`${(item.score*100).toFixed(1)}%`));const track=el('div','ai-score-track'),fill=el('i');fill.style.width=`${item.score*100}%`;track.append(fill);row.append(meta,track);bars.append(row);}
      result.append(el('p','ai-note','UNCALIBRATED MODEL SCORES'),bars,el('p','ai-coverage',`Known-pattern coverage: ${(classification.coverage*100).toFixed(1)}%`),el('p','ai-disclaimer',classification.abstained?(classification.reasons||['Coverage or score below the development threshold.']).join(' '):'A high score does not establish correctness. Unfamiliar messages can still be routed incorrectly.'));
      await renderHistory();
    }catch(error){notify(error.message,'error');}finally{submit.disabled=false;}
  });
  wrap.append(intro,grid,evidence,history);root.append(header,wrap);await renderHistory();
}
