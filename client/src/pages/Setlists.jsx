import { useState, useRef, useEffect } from 'react'
import { useSongs } from '../hooks/useSongs'
import { useSetlists } from '../hooks/useSetlists'

export default function Setlists() {
  const { songs } = useSongs()
  const { setlists, saveSetlist, deleteSetlist } = useSetlists()
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // ── Save queue: serializes persist() calls so a create (POST) always
  // finishes and hands back a real id before any later save is sent,
  // preventing duplicate setlist rows. ──────────────────────────────
  const savingRef = useRef(false)
  const pendingRef = useRef(null)

  const persist = async (updated) => {
    pendingRef.current = updated
    if (savingRef.current) return // already saving; the loop below will pick this up
    savingRef.current = true
    try {
      while (pendingRef.current) {
        const toSave = pendingRef.current
        pendingRef.current = null
        try {
          const saved = await saveSetlist(toSave)
          if (saved && saved.id && toSave.id.startsWith('new-')) {
            const withRealId = { ...toSave, id: saved.id }
            // Only update draft/selected if we're still looking at this setlist
            setDraft(d => (d && d.id === toSave.id ? withRealId : d))
            setSelected(prevSel => (prevSel === toSave.id ? saved.id : prevSel))
            // If a newer save queued up while this POST was in flight,
            // rewrite its stale temp id to the real one so it PUTs
            // against the correct record instead of creating another.
            if (pendingRef.current && pendingRef.current.id === toSave.id) {
              pendingRef.current = { ...pendingRef.current, id: saved.id }
            }
          }
        } catch (e) {
          console.error('Auto-save failed', e)
          showToast('Save failed — check connection')
        }
      }
    } finally {
      savingRef.current = false
    }
  }

  const defaultSetlistName = () => {
    const today = new Date()
    return `Untitled setlist – ${today.toISOString().slice(0, 10)}`
  }

  const newSetlist = () => {
    const blank = {
      id: `new-${Date.now()}`,
      name: defaultSetlistName(),
      date: new Date().toISOString().slice(0, 10),
      songs: []
    }
    setSelected(blank.id)
    setDraft(blank)
  }

  const openSetlist = (sl) => {
    setSelected(sl.id)
    setDraft(JSON.parse(JSON.stringify(sl)))
  }

  const addSong = (song) => {
    if (draft.songs.find(s => s.id === song.id)) return
    const updated = { ...draft, songs: [...draft.songs, song] }
    setDraft(updated)
    persist(updated)
  }

  const removeSong = (id) => {
    const updated = { ...draft, songs: draft.songs.filter(s => s.id !== id) }
    setDraft(updated)
    persist(updated)
  }

  const moveSong = (index, dir) => {
    const arr = [...draft.songs]
    const swap = index + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[index], arr[swap]] = [arr[swap], arr[index]]
    const updated = { ...draft, songs: arr }
    setDraft(updated)
    persist(updated)
  }

  const updateName = (name) => setDraft(d => ({ ...d, name }))
  const updateDate = (date) => setDraft(d => ({ ...d, date }))

  const handleSave = async () => {
    if (!draft.name.trim()) { showToast('Add a setlist name'); return }
    await persist(draft)
    showToast('Saved!')
  }

  const handleDelete = async () => {
    if (!draft || draft.id.startsWith('new-')) return
    if (!window.confirm(`Delete "${draft.name}"?`)) return
    await deleteSetlist(draft.id)
    setDraft(null); setSelected(null)
  }

  const availableSongs = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) &&
    !(draft?.songs || []).find(x => x.id === s.id)
  )

  return (
    <div className="flex h-full">
      {/* Setlist sidebar */}
      <div className="w-52 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="label mb-0">Setlists</span>
          <button className="btn-ghost px-2 py-0.5 text-lg leading-none" onClick={newSetlist}>+</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {setlists.map(sl => (
            <div key={sl.id} onClick={() => openSetlist(sl)}
              className="px-3 py-2 rounded-lg cursor-pointer transition-all"
              style={{
                background: selected === sl.id ? 'rgba(124,106,247,0.1)' : 'transparent',
                borderLeft: selected === sl.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
              <p className="text-sm font-medium truncate"
                style={{ color: selected === sl.id ? 'var(--accent-light)' : 'var(--text)' }}>
                {sl.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                {sl.date || 'No date'} · {sl.songs?.length ?? 0} songs
              </p>
            </div>
          ))}
          {setlists.length === 0 && (
            <p className="text-xs p-2 text-center" style={{ color: 'var(--text3)' }}>No setlists yet</p>
          )}
        </div>
        <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn w-full text-xs" onClick={newSetlist}>+ New setlist</button>
        </div>
      </div>

      {/* Setlist editor */}
      {!draft ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text3)' }}>
          <p className="text-sm">Select a setlist or create one</p>
          <button className="btn-primary" onClick={newSetlist}>+ New setlist</button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Draft editor */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm flex-1" style={{ color: 'var(--text2)' }}>
                {draft.name || 'New setlist'}
              </span>
              <button className="btn-danger text-xs" onClick={handleDelete}>Delete</button>
              <button className="btn-primary text-xs" onClick={handleSave}>Save</button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Setlist name</label>
                  <input className="input" placeholder="e.g. Sunday Morning Service"
                    value={draft.name} onChange={e => updateName(e.target.value)}
                    onBlur={() => persist(draft)} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date"
                    value={draft.date} onChange={e => updateDate(e.target.value)}
                    onBlur={() => persist(draft)} />
                </div>
              </div>

              <div>
                <label className="label">Songs in setlist ({draft.songs.length})</label>
                {draft.songs.length === 0 ? (
                  <div className="rounded-xl p-6 text-center" style={{ border: '1px dashed var(--border2)' }}>
                    <p className="text-sm" style={{ color: 'var(--text3)' }}>
                      Add songs from the panel on the right
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {draft.songs.map((song, i) => (
                      <div key={song.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                        <span className="text-xs w-5 text-center" style={{ color: 'var(--text3)' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{song.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text3)' }}>Key {song.key}</p>
                        </div>
                        <div className="flex gap-1">
                          <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => moveSong(i, -1)} disabled={i === 0}>↑</button>
                          <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => moveSong(i, 1)} disabled={i === draft.songs.length - 1}>↓</button>
                          <button className="btn-ghost px-1.5 py-0.5 text-xs" style={{ color: 'var(--red)' }} onClick={() => removeSong(song.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Song picker */}
          <div className="w-56 flex-shrink-0 flex flex-col">
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <label className="label">Add songs</label>
              <input className="input" placeholder="Search…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {availableSongs.map(song => (
                <div key={song.id}
                  onClick={() => addSong(song)}
                  className="px-3 py-2 rounded-lg cursor-pointer transition-all"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{song.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Key {song.key} · {song.sections?.length} sections</p>
                </div>
              ))}
              {availableSongs.length === 0 && (
                <p className="text-xs p-2 text-center" style={{ color: 'var(--text3)' }}>
                  {songs.length === draft.songs.length ? 'All songs added' : 'No matches'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 text-sm px-4 py-2 rounded-lg z-50"
          style={{ background: 'var(--green)', color: '#fff' }}>
          {toast}
        </div>
      )}
    </div>
  )
}