import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Dexie, { type Table } from 'dexie'
import './styles.css'
import './blue.css'

type ApiConfig = { id?: number; name: string; baseUrl: string; apiKey: string; model: string }
type Message = { id?: number; role: 'user' | 'assistant'; content: string; createdAt: number }

class HegDB extends Dexie {
  apiConfigs!: Table<ApiConfig, number>
  messages!: Table<Message, number>
  constructor() { super('heg-pocki'); this.version(1).stores({ apiConfigs: '++id', messages: '++id,createdAt' }) }
}
const db = new HegDB()

async function callApi(config: ApiConfig, messages: Message[]) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: messages.map(({ role, content }) => ({ role, content })) })
  })
  if (!response.ok) throw new Error(`API 请求失败：${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? 'API 未返回内容'
}

const apps = ['Chat','Moments','Diary','Contacts','Gallery','Characters','Worldbook','Memory','Settings','API Manager']
function App() {
  const [active, setActive] = useState('home'); const [page, setPage] = useState(0); const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState(''); const [config, setConfig] = useState<ApiConfig>({name:'Default',baseUrl:'https://api.openai.com/v1',apiKey:'',model:'gpt-4o-mini'})
  const [busy, setBusy] = useState(false)
  useEffect(() => { db.apiConfigs.toCollection().first().then(x => x && setConfig(x)); db.messages.orderBy('createdAt').toArray().then(setMessages) }, [])
  async function send() { if (!text.trim() || busy) return; const user: Message={role:'user',content:text.trim(),createdAt:Date.now()}; const next=[...messages,user]; setMessages(next); setText(''); setBusy(true); await db.messages.add(user); try { const reply: Message={role:'assistant',content:await callApi(config,next),createdAt:Date.now()}; setMessages([...next,reply]); await db.messages.add(reply) } catch(e) { setMessages([...next,{role:'assistant',content:e instanceof Error?e.message:'请求失败',createdAt:Date.now()}]) } finally { setBusy(false) } }
  async function saveConfig() { await db.apiConfigs.clear(); await db.apiConfigs.add(config); alert('API 配置已保存到本地') }
  const pages=[apps.slice(0,6),apps.slice(6)]; const touchStart=useRef(0); const onTouchStart=(e:React.TouchEvent)=>{touchStart.current=e.changedTouches[0].clientX}; const onTouchEnd=(e:React.TouchEvent)=>{const delta=e.changedTouches[0].clientX-touchStart.current;if(Math.abs(delta)>45)setPage(p=>Math.max(0,Math.min(pages.length-1,p+(delta<0?1:-1))))};
  return <main className="stage"><div className="phone"><header><span>9:41</span><b>POCKI</b><span>▮▮ 5G ◉</span></header>{active==='home' ? <><section className="desktop"><div className="widget"><strong>POCKI</strong><small>{new Date().toLocaleDateString()}</small></div><div className="page-window" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><div className="page-track" style={{transform:`translateX(-${page*100}%)`}}>{pages.map((items,pi)=><div className="page" key={pi}>{items.map(a=><button className="app-icon" key={a} onClick={()=>setActive(a)}><i>{a.slice(0,1)}</i><span>{a}</span></button>)}</div>)}</div></div><div className="page-dots">{pages.map((_,i)=><button className={i===page?'selected':''} onClick={()=>setPage(i)} key={i}>●</button>)}</div></section><div className="dock"><button onClick={()=>setActive('Chat')}>Chat</button><button onClick={()=>setActive('Diary')}>Diary</button><button onClick={()=>setActive('Settings')}>Settings</button></div></> : <section className="app"><button onClick={()=>setActive('home')}>← 桌面</button><h2>{active}</h2>{active==='Chat' && <><div className="messages">{messages.map((m,i)=><p key={i} className={m.role}>{m.content}</p>)}</div><div className="composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="输入消息"/><button onClick={send}>{busy?'…':'发送'}</button></div></>}{active==='API Manager'&&<div className="form">{(['baseUrl','apiKey','model'] as const).map(k=><label key={k}>{k}<input type={k==='apiKey'?'password':'text'} value={config[k]} onChange={e=>setConfig({...config,[k]:e.target.value})}/></label>)}<button onClick={saveConfig}>保存配置</button></div>}{active!=='Chat'&&active!=='API Manager'&&<p>应用框架已建立，功能模块待接入。</p>}</section>}<div className="home-indicator" /></div></main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
