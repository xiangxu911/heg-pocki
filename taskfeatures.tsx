import React, { useMemo, useState } from 'react'

export type ScheduledTask = {
  id?: number
  title: string
  content: string
  threadId: string
  dueAt: number
  repeat: 'once' | 'daily'
  enabled: boolean
  createdAt: number
  lastRunAt?: number
}

type Store<T> = { add(value: T): Promise<number>; put(value: T): Promise<unknown>; delete(key: number): Promise<void> }
function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) { return <section className="app feature-app"><button onClick={onBack}>← 桌面</button>{children}</section> }
function localDateTime(value: number) { const date = new Date(value - new Date().getTimezoneOffset() * 60000); return date.toISOString().slice(0, 16) }

export function TaskCenter({ tasks, setTasks, db, threads, onBack, onRun }: { tasks: ScheduledTask[]; setTasks: React.Dispatch<React.SetStateAction<ScheduledTask[]>>; db: { tasks: Store<ScheduledTask> }; threads: { id: string; name: string }[]; onBack: () => void; onRun: (task: ScheduledTask) => Promise<void> }) {
  const [editing, setEditing] = useState<ScheduledTask | null>(null); const [notice, setNotice] = useState('')
  const sorted = useMemo(() => [...tasks].sort((a, b) => a.dueAt - b.dueAt), [tasks])
  const save = async () => { if (!editing?.title.trim() || !editing.content.trim()) return; const item = { ...editing, title: editing.title.trim(), content: editing.content.trim() }; if (item.id) await db.tasks.put(item); else item.id = await db.tasks.add(item); setTasks(current => current.some(value => value.id === item.id) ? current.map(value => value.id === item.id ? item : value) : [...current, item]); setEditing(null); setNotice('后台任务已保存到本机') }
  const toggle = async (item: ScheduledTask) => { const next = { ...item, enabled: !item.enabled }; await db.tasks.put(next); setTasks(current => current.map(value => value.id === item.id ? next : value)) }
  const remove = async (item: ScheduledTask) => { if (!item.id || !window.confirm(`删除“${item.title}”？`)) return; await db.tasks.delete(item.id); setTasks(current => current.filter(value => value.id !== item.id)) }
  const run = async (item: ScheduledTask) => { await onRun(item); const next = { ...item, enabled: item.repeat === 'daily', lastRunAt: Date.now(), dueAt: item.repeat === 'daily' ? item.dueAt + 86400000 : item.dueAt }; if (item.id) await db.tasks.put(next); setTasks(current => current.map(value => value.id === item.id ? next : value)); setNotice('已生成主动消息，并写入聊天与通知中心') }
  return <Shell onBack={onBack}><div className="feature-heading"><div><span className="eyebrow">BACKGROUND TASKS</span><h2>后台任务</h2></div><button className="primary-small" onClick={() => setEditing({ title: '', content: '', threadId: threads[0]?.id || 'mika', dueAt: Date.now() + 600000, repeat: 'once', enabled: true, createdAt: Date.now() })}>＋ 新建</button></div><div className="task-note"><strong>让角色在指定时间主动找你</strong><p>任务保存在当前设备。网页打开或恢复时会检查到期任务；真正的关网页后台执行需要后续接入云端服务。</p></div>{notice && <div className="status-note">{notice}</div>}<div className="record-list">{sorted.map(item => <article className={`task-card ${item.enabled ? '' : 'is-disabled'}`} key={item.id}><div className="task-card-top"><div><strong>{item.title}</strong><small>{item.repeat === 'daily' ? '每天' : '单次'} · {new Date(item.dueAt).toLocaleString()}</small></div><button className={`task-toggle ${item.enabled ? 'on' : ''}`} onClick={() => void toggle(item)}>{item.enabled ? '启用' : '暂停'}</button></div><p>{item.content}</p><small>发送给：{threads.find(thread => thread.id === item.threadId)?.name || 'Mika'}{item.lastRunAt ? ` · 上次执行 ${new Date(item.lastRunAt).toLocaleString()}` : ''}</small><div className="card-actions"><button className="ghost-small" onClick={() => setEditing(item)}>编辑</button><button className="ghost-small" onClick={() => void run(item)}>立即执行</button><button className="delete-small" onClick={() => void remove(item)}>删除</button></div></article>)}{!sorted.length && <div className="empty-card">还没有后台任务。可以先创建一条“晚安提醒”试试。</div>}</div>{editing && <div className="modal-backdrop"><div className="modal-card"><div className="feature-heading"><h3>{editing.id ? '编辑后台任务' : '新建后台任务'}</h3><button onClick={() => setEditing(null)}>×</button></div><label>任务名称<input value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} placeholder="例如：晚安消息" /></label><label>主动消息<textarea rows={4} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} placeholder="例如：今天也辛苦啦，早点休息。" /></label><label>发送给<select value={editing.threadId} onChange={event => setEditing({ ...editing, threadId: event.target.value })}>{threads.map(thread => <option key={thread.id} value={thread.id}>{thread.name}</option>)}</select></label><label>执行时间<input type="datetime-local" value={localDateTime(editing.dueAt)} onChange={event => setEditing({ ...editing, dueAt: new Date(event.target.value).getTime() })} /></label><label>重复方式<select value={editing.repeat} onChange={event => setEditing({ ...editing, repeat: event.target.value as ScheduledTask['repeat'] })}><option value="once">只执行一次</option><option value="daily">每天执行</option></select></label><button className="primary-action" onClick={() => void save()}>保存任务</button></div></div>}</Shell>
}
