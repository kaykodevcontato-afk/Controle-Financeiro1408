from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
base=Path(__file__).resolve().parents[1]
soup=BeautifulSoup((base/'index.html').read_text('utf8'),'html.parser')
for link in list(soup.select('link[rel=stylesheet]')):
    f=base/link.get('href','')
    if not f.is_file():continue
    node=soup.new_tag('style');node.string=f.read_text('utf8');link.replace_with(node)
scripts=[]
for link in list(soup.select('script[src]')):
    f=base/link.get('src','')
    if f.is_file():scripts.append(f.read_text('utf8'))
    link.decompose()
for txt in scripts:
    node=soup.new_tag('script');node.string=txt;soup.body.append(node)
html=str(soup)
# Make data stress-test: 10 default + a long category, long note, long money, active debt, wallets etc.
data={'version':1,'transactions':[{'id':'t1','date':'2026-11-12','type':'Gasto','category':'Lazer','description':'Teste','payment':'Pix','amount':160},{'id':'t2','date':'2026-11-12','type':'Gasto','category':'Alimentação','description':'Teste','payment':'Dinheiro','amount':100}], 'bills':[],'goals':[],'budgets':{'2026-11':{'Lazer':200,'Alimentação':500,'Moradia':700,'Supermercado e entretenimento especializado':1500}},'categoryCatalog':['Moradia','Alimentação','Transporte','Contas','Saúde','Educação','Lazer','Compras','Dívidas','Outros','Supermercado e entretenimento especializado'],'customCategories':['Supermercado e entretenimento especializado'], 'categoryNotes':{'Lazer':'Categoria de lazer: observação longa para mostrar em telas estreitas, sem quebrar o layout nem sobrepor a edição e a exclusão.', 'Moradia':'Observação curta', 'Supermercado e entretenimento especializado':'Algumas compras complexas, contas e documentos associados a gastos familiares recorrentes.'}}
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1366,'height':850})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate("""() => {window._mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window._mem[k]||null,setItem:(k,v)=>{window._mem[k]=String(v)},removeItem:k=>delete window._mem[k]}})}""")
  page.evaluate('(d)=>localStorage.setItem("kayko-controle-financeiro-v1",JSON.stringify(d))',data)
  page.set_content(html,wait_until='domcontentloaded')
  page.locator('#monthSelect').select_option('11')
  page.locator('#yearSelect').fill('2026')
  page.locator('#yearSelect').press('Tab')
  views=['painel','lancamentos','orcamento','contas','metas','cofrinhos','carteiras','pix','dividas','investimentos','calculadora','notas','ajuda']
  scales={'50%':2732,'75%':1821,'100%':1366,'125%':1093,'150%':911,'200%':683,'250%':546,'300%':455,'400%':342}
  count=0
  for zoom,width in scales.items():
    page.set_viewport_size({'width':width,'height':830})
    for view in views:
      page.evaluate('(v)=>document.querySelector(`[data-view="${v}"]`).click()',view)
      out=page.evaluate('''() => {
        const r=e=>e.getBoundingClientRect();
        const overlap=(a,b)=>{const x=r(a),y=r(b);return Math.min(x.right,y.right)-Math.max(x.left,y.left)>2 && Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2};
        const hasVisible=e=>getComputedStyle(e).display!=='none'&&r(e).width>0&&r(e).height>0;
        const sels=['.topbar','.topbar-right','.topbar-backup-actions','.theme-controls','.page-heading','#view-orcamento .budget-row','#view-orcamento .budget-panel-heading','#view-orcamento .section-toolbar'];
        let collisions=[];
        for(let sel of sels){for(let item of document.querySelectorAll(sel)){ if(!hasVisible(item))continue;
          const children=[...item.children].filter(hasVisible);
          for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++)if(overlap(children[i],children[j]))collisions.push({sel,first:children[i].className,second:children[j].className});
        }}
        const scrollWidth=document.documentElement.scrollWidth;
        return {vw:innerWidth,scrollWidth,collisions:collisions.slice(0,6)};
      }''')
      if out['scrollWidth']>width+1:print('H-OVERFLOW',zoom,view,out['scrollWidth']-width)
      if out['collisions']:print('COLLISIONS',zoom,view,out['collisions'])
      assert out['scrollWidth']<=width+1,(zoom,view,out)
      assert not out['collisions'],(zoom,view,out)
      count+=1
    if zoom in ['50%','100%','200%','300%','400%']:
      page.evaluate('()=>document.querySelector(`[data-view="orcamento"]`).click()')
      # scroll to find Lazer element by text
      page.locator('.budget-cat-title',has_text='Lazer').scroll_into_view_if_needed()
      # modal dialogs must remain inside accessible viewport, overflow allowed internal
      page.evaluate('()=>document.querySelector(`[data-action="add-category"]`).click()')
      d=page.evaluate('''() => {let r=document.querySelector('.dialog').getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,screen:innerWidth}}''')
      assert d['left']>=-2 and d['right']<=width+2,(zoom,d)
      page.evaluate('()=>document.querySelector("#closeModal").click()') if page.locator('#closeModal').count() else page.keyboard.press('Escape')
  print(f'PASS: {count} telas revisadas em 9 níveis de zoom; sem sobreposição nem rolagem horizontal; erros JS: {len(errors)}')
  assert not errors,errors
  browser.close()
