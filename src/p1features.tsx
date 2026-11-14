import React, { useState } from 'react'

export type CharacterRecord = { id?: number; name: string; avatar: string; description: string; personality: string; scenario: string; updatedAt: number }
export type MemoryRecord = { id?: number; title: string; content: string; type: string; character: string; threadId?: string; updatedAt: number }
export type RoleStateRecord = { id: string; threadId: string; mood: string; energy: number; relationship: string; lastEvent: string; updatedAt: number }
export type RelationshipEventRecord = { id?: number; threadId: string; type: string; content: string; createdAt: number }
export type WorldbookRecord = { id?: number; title: string; keywords: string; content: string; enabled: boolean; updatedAt: number }
type MemorySource = { id?: number; threadId?: string; role: 'user' | 'assistant'; content: string; createdAt: number }
type MemoryCandidate = { key: string; title: string; content: string; type: string; character: string; threadId?: string; updatedAt: number }
type Store<T> = { add(value: T): Promise<number>; put(value: T): Promise<unknown>; delete(key: number): Promise<void> }

function Back({ children }: { children: React.ReactNode }) { return <section className="app feature-app"><button onClick={() => window.location.assign(window.location.pathname)}>← 桌面</button>{children}</section> }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop"><div className="modal-card"><div className="feature-heading"><h3>{title}</h3><button onClick={onClose}>×</button></div>{children}</div></div> }

export function Characters({ items, setItems, db }: { items: CharacterRecord[]; setItems: React.Dispatch<React.SetStateAction<CharacterRecord[]>>; db: { characters: Store<CharacterRecord> } }) {
  const [editing, setEditing] = useState<CharacterRecord | null>(null); const [query, setQuery] = useState('')
  const save = async () => { if (!editing?.name.trim()) return; const item = { ...editing, name: editing.name.trim(), updatedAt: Date.now() }; if (item.id) await db.characters.put(item); else item.id = await db.characters.add(item); setItems(current => current.some(x => x.id === item.id) ? current.map(x => x.id === item.id ? item : x) : [item, ...current]); setEditing(null) }
  const remove = async (id?: number) => { if (id && confirm('删除这个角色？相关聊天记录会保留。')) { await db.characters.delete(id); setItems(current => current.filter(x => x.id !== id)) } }
  const filtered = items.filter(x => `${x.name}${x.description}${x.personality}`.toLowerCase().includes(query.toLowerCase()))
  return <Back><div className="feature-heading"><div><span className="eyebrow">AI CAST</span><h2>角色管理</h2></div><button className="primary-small" onClick={() => setEditing({ name: '', avatar: '🫧', description: '', personality: '', scenario: '', updatedAt: Date.now() })}>＋ 新建</button></div><input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索角色" /><div className="record-list">{filtered.map(item => <article className="record-card character-record" key={item.id}><div className="record-avatar">{item.avatar}</div><div className="record-main"><strong>{item.name}</strong><small>{item.description || '还没有简介'}{item.personality ? ` · ${item.personality}` : ''}</small></div><button className="ghost-small" onClick={() => setEditing(item)}>编辑</button><button className="delete-small" onClick={() => void remove(item.id)}>删除</button></article>)}{!filtered.length && <div className="empty-card">还没有角色，先创建一个属于你的角色吧。</div>}</div>{editing && <Modal title={editing.id ? '编辑角色' : '新建角色'} onClose={() => setEditing(null)}>{(['name', 'avatar', 'description', 'personality', 'scenario'] as const).map(key => <label key={key}>{key === 'name' ? '名称' : key === 'avatar' ? '头像' : key === 'description' ? '简介' : key === 'personality' ? '人格与说话风格' : '背景故事'}{key === 'description' ? <textarea rows={2} value={editing[key]} onChange={event => setEditing({ ...editing, [key]: event.target.value })} /> : key === 'personality' || key === 'scenario' ? <textarea rows={4} value={editing[key]} onChange={event => setEditing({ ...editing, [key]: event.target.value })} /> : <input value={editing[key]} onChange={event => setEditing({ ...editing, [key]: event.target.value })} />}</label>)}<button className="primary-action" onClick={() => void save()}>保存角色</button></Modal>}</Back>
}

export function Memories({ items, setItems, db, messages = [] }: { items: MemoryRecord[]; setItems: React.Dispatch<React.SetStateAction<MemoryRecord[]>>; db: { memories: Store<MemoryRecord> }; messages?: MemorySource[] }) {
  const [editing, setEditing] = useState<MemoryRecord | null>(null)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<MemoryCandidate[]>([])
  const [helperNotice, setHelperNotice] = useState('')
  const save = async () => {
    if (!editing?.title.trim()) return
    const item = { ...editing, title: editing.title.trim(), updatedAt: Date.now() }
    if (item.id) await db.memories.put(item)
    else item.id = await db.memories.add(item)
    setItems(current => current.some(x => x.id === item.id) ? current.map(x => x.id === item.id ? item : x) : [item, ...current])
    setEditing(null)
  }
  const remove = async (id?: number) => {
    if (id && confirm('删除这条记忆？')) {
      await db.memories.delete(id)
      setItems(current => current.filter(x => x.id !== id))
    }
  }
  const scanChats = () => {
    const keywords = /(喜欢|不喜欢|讨厌|希望|想要|不要|叫我|我是|我的|以后|生日|纪念|住在|学校|专业|过敏|不能|偏好|习惯|记得)/
    const existing = new Set(items.map(item => item.content.trim()))
    const found = messages
      .filter(message => message.content.trim().length >= 8 && keywords.test(message.content) && !existing.has(message.content.trim()))
      .slice(-30)
      .reverse()
      .slice(0, 6)
      .map((message, index) => ({
        key: String(message.id || message.createdAt) + '-' + index,
        title: '聊天记录 · ' + new Date(message.createdAt).toLocaleDateString(),
        content: message.content.trim(),
        type: '待确认',
        character: '',
        threadId: message.threadId,
        updatedAt: message.createdAt
      }))
    setCandidates(found)
    setHelperNotice(found.length ? '找到 ' + found.length + ' 条候选，请确认后再保存' : '最近聊天里暂时没有明显的长期信息')
  }
  const acceptCandidate = async (candidate: MemoryCandidate) => {
    const item: MemoryRecord = { title: candidate.title, content: candidate.content, type: '长期记忆', character: candidate.character, threadId: candidate.threadId, updatedAt: Date.now() }
    item.id = await db.memories.add(item)
    setItems(current => [item, ...current])
    setCandidates(current => current.filter(value => value.key !== candidate.key))
    setHelperNotice('已加入记忆库')
  }
  const filtered = items.filter(x => (x.title + x.content + x.character + x.type).toLowerCase().includes(query.toLowerCase()))
  return <Back>
    <div className="feature-heading"><div><span className="eyebrow">MEMORY CORE</span><h2>记忆库</h2></div><button className="primary-small" onClick={() => setEditing({ title: '', content: '', type: '长期记忆', character: '', updatedAt: Date.now() })}>＋ 新建</button></div>
    <section className="memory-helper-card">
      <div className="memory-helper-head"><div><span className="eyebrow">MEMORY ASSISTANT</span><h3>从聊天提取候选</h3></div><button className="primary-small" onClick={scanChats}>扫描最近聊天</button></div>
      <p>只读取当前设备上的聊天记录，先生成候选，不会未经确认自动写入。</p>
      {helperNotice && <small className="helper-notice">{helperNotice}</small>}
      {candidates.map(candidate => <article className="memory-candidate" key={candidate.key}><span>待确认</span><p>{candidate.content}</p><div><button className="ghost-small" onClick={() => void acceptCandidate(candidate)}>加入长期记忆</button><button className="delete-small" onClick={() => setCandidates(current => current.filter(value => value.key !== candidate.key))}>忽略</button></div></article>)}
    </section>
    <input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索记忆" />
    <div className="record-list">{filtered.map(item => <article className="memory-card" key={item.id}><div className="memory-tag">{item.type}</div><strong>{item.title}</strong><small>{item.character ? '关联角色：' + item.character : '未关联角色'}</small><p>{item.content}</p><div className="card-actions"><button className="ghost-small" onClick={() => setEditing(item)}>编辑</button><button className="delete-small" onClick={() => void remove(item.id)}>删除</button></div></article>)}{!filtered.length && <div className="empty-card">还没有记忆，重要的事情可以记在这里。</div>}</div>
    {editing && <Modal title={editing.id ? '编辑记忆' : '新建记忆'} onClose={() => setEditing(null)}><label>标题<input value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label><label>类型<select value={editing.type} onChange={event => setEditing({ ...editing, type: event.target.value })}><option>长期记忆</option><option>短期记忆</option><option>重要事件</option><option>人物关系</option></select></label><label>关联角色<input value={editing.character} onChange={event => setEditing({ ...editing, character: event.target.value })} placeholder="可留空" /></label><label>内容<textarea rows={6} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} /></label><button className="primary-action" onClick={() => void save()}>保存记忆</button></Modal>}
  </Back>
}
type RoleStateStore = { put(value: RoleStateRecord): Promise<unknown>; delete(key: string): Promise<void>; toArray(): Promise<RoleStateRecord[]> }
type RelationshipEventStore = { add(value: RelationshipEventRecord): Promise<number>; toArray(): Promise<RelationshipEventRecord[]> }
export function RoleStates({ db, threads }: { db: { roleStates: RoleStateStore; relationshipEvents: RelationshipEventStore }; threads: { id: string; name: string; avatar: string }[] }) {
  const [items, setItems] = useState<RoleStateRecord[]>([]); const [events, setEvents] = useState<RelationshipEventRecord[]>([]); const [editing, setEditing] = useState<RoleStateRecord | null>(null)
  React.useEffect(() => { db.roleStates.toArray().then(setItems).catch(() => {}); db.relationshipEvents.toArray().then(setEvents).catch(() => {}) }, [db])
  const save = async () => { if (!editing) return; const item = { ...editing, id: editing.threadId, updatedAt: Date.now() }; await db.roleStates.put(item); setItems(current => current.some(x => x.threadId === item.threadId) ? current.map(x => x.threadId === item.threadId ? item : x) : [...current, item]); setEditing(null) }
  const remove = async (threadId: string) => { if (!confirm('清除这个角色的情绪状态？')) return; await db.roleStates.delete(threadId); setItems(current => current.filter(x => x.threadId !== threadId)) }
  return <Back><div className="feature-heading"><div><span className="eyebrow">ROLE STATE</span><h2>角色状态</h2></div><button className="primary-small" onClick={() => { const thread = threads[0]; setEditing({ id: thread?.id || 'mika', threadId: thread?.id || 'mika', mood: '平静', energy: 80, relationship: '刚认识', lastEvent: '', updatedAt: Date.now() }) }}>＋ 设置状态</button></div><p className="section-intro">每个聊天对象都有独立的情绪、精力、关系阶段和最近事件。聊天后会自动留下共同经历，角色会逐渐认识你。</p><div className="record-list">{threads.map(thread => { const state = items.find(item => item.threadId === thread.id); const history = events.filter(item => item.threadId === thread.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4); return <article className="record-card role-state-card" key={thread.id}><div className="record-avatar">{thread.avatar}</div><div className="record-main"><strong>{thread.name}</strong><small>{state ? `● ${state.mood} · 关系：${state.relationship} · 精力 ${state.energy}%` : '还没有设置状态，使用默认状态'}</small>{state?.lastEvent && <p>最近事件：{state.lastEvent}</p>}{history.length > 0 && <div className="relationship-history"><span>共同经历</span>{history.map(event => <small key={event.id}>{event.content} · {new Date(event.createdAt).toLocaleDateString()}</small>)}</div>}</div><button className="ghost-small" onClick={() => setEditing(state || { id: thread.id, threadId: thread.id, mood: '平静', energy: 80, relationship: '刚认识', lastEvent: '', updatedAt: Date.now() })}>编辑</button>{state && <button className="delete-small" onClick={() => void remove(thread.id)}>清除</button>}</article>})}</div>{editing && <Modal title="编辑角色状态" onClose={() => setEditing(null)}><label>聊天对象<select value={editing.threadId} onChange={event => setEditing({ ...editing, threadId: event.target.value, id: event.target.value })}>{threads.map(thread => <option value={thread.id} key={thread.id}>{thread.name}</option>)}</select></label><label>当前情绪<input value={editing.mood} onChange={event => setEditing({ ...editing, mood: event.target.value })} placeholder="例如：开心、疲惫、想念" /></label><label>精力：{editing.energy}%<input type="range" min="0" max="100" value={editing.energy} onChange={event => setEditing({ ...editing, energy: Number(event.target.value) })} /></label><label>关系阶段<input value={editing.relationship} onChange={event => setEditing({ ...editing, relationship: event.target.value })} placeholder="例如：熟悉、暧昧、亲密" /></label><label>最近事件<textarea rows={4} value={editing.lastEvent} onChange={event => setEditing({ ...editing, lastEvent: event.target.value })} placeholder="会作为聊天背景参考" /></label><button className="primary-action" onClick={() => void save()}>保存状态</button></Modal>}</Back>
}

export function Worldbook({ items, setItems, db }: { items: WorldbookRecord[]; setItems: React.Dispatch<React.SetStateAction<WorldbookRecord[]>>; db: { worldbooks: Store<WorldbookRecord> } }) {
  const [editing, setEditing] = useState<WorldbookRecord | null>(null)
  const save = async () => { if (!editing?.title.trim()) return; const item = { ...editing, title: editing.title.trim(), updatedAt: Date.now() }; if (item.id) await db.worldbooks.put(item); else item.id = await db.worldbooks.add(item); setItems(current => current.some(x => x.id === item.id) ? current.map(x => x.id === item.id ? item : x) : [item, ...current]); setEditing(null) }
  const remove = async (id?: number) => { if (id && confirm('删除这个世界书条目？')) { await db.worldbooks.delete(id); setItems(current => current.filter(x => x.id !== id)) } }
  return <Back><div className="feature-heading"><div><span className="eyebrow">WORLD RULES</span><h2>世界书</h2></div><button className="primary-small" onClick={() => setEditing({ title: '', keywords: '', content: '', enabled: true, updatedAt: Date.now() })}>＋ 新建</button></div><div className="record-list">{items.map(item => <article className={`worldbook-card ${item.enabled ? '' : 'is-disabled'}`} key={item.id}><div className="worldbook-head"><div><strong>{item.title}</strong><small>关键词：{item.keywords || '未设置'}</small></div><button className={`toggle-button ${item.enabled ? 'on' : ''}`} onClick={async () => { const next = { ...item, enabled: !item.enabled }; await db.worldbooks.put(next); setItems(current => current.map(x => x.id === item.id ? next : x)) }}>{item.enabled ? '启用中' : '已停用'}</button></div><p>{item.content || '还没有设定内容。'}</p><div className="card-actions"><button className="ghost-small" onClick={() => setEditing(item)}>编辑</button><button className="delete-small" onClick={() => void remove(item.id)}>删除</button></div></article>)}{!items.length && <div className="empty-card">还没有世界书条目，先写下你的世界规则。</div>}</div>{editing && <Modal title={editing.id ? '编辑世界书' : '新建世界书'} onClose={() => setEditing(null)}><label>条目名称<input value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} /></label><label>关键词<input value={editing.keywords} onChange={event => setEditing({ ...editing, keywords: event.target.value })} placeholder="用逗号分隔，例如：学校,教室" /></label><label>世界设定<textarea rows={7} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} /></label><button className="primary-action" onClick={() => void save()}>保存世界书</button></Modal>}</Back>
}
