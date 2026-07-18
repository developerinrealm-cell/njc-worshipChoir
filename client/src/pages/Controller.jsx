import { useSongs } from '../hooks/useSongs'
import { useSocket } from '../context/SocketContext'
import { useSetlists } from '../hooks/useSetlists'
import { useState } from 'react'
import { BACKGROUND_THEMES, getThemeForSection, setThemeForSection } from '../constants/backgroundThemes'
import { getPresentationSections } from '../utils/presentationSections'

const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'te', label: 'Telugu' },
  { id: 'both', label: 'Both' },
]

export default function Controller() {
  const { songs } = useSongs()
  const { setlists } = useSetlists()
  const { presenterState, updatePresenter, connected } = useSocket()
  const [search, setSearch] = useState('')
  const [activeSetlist, setActiveSetlist] = useState(null)

  const { songId, sectionIndex, lang, blank } = presenterState

  const currentSong = songs.find(s => s.id === songId)
  const presentationSections = getPresentationSections(currentSong?.sections || [])
  const currentSection = presentationSections?.[sectionIndex]
  const getSectionLyrics = (section, currentLang) => {
    if (!section) return "";

    if (currentLang === 'te') {
      return section.lyrics_te?.trim() || section.lyrics_en?.trim() || "";
    }

    if (currentLang === 'both') {
      return section.lyrics_en?.trim() || section.lyrics_te?.trim() || "";
    }

    return section.lyrics_en?.trim() || section.lyrics_te?.trim() || "";
  };
  const formatSectionLabel = (type) => {
    if (!type) return 'Section'
    const normalized = String(type).trim()
    if (normalized === 'Repeater') return 'Repeater'
    if (normalized === 'Pre-Chorus') return 'Pre-Chorus'
    if (normalized === 'Bridge 1') return 'Bridge 1'
    if (normalized === 'Bridge 2') return 'Bridge 2'
    return normalized
  }

  const getSectionAccent = (type) => {
    const normalized = String(type || '').trim().toLowerCase()
    if (normalized === 'chorus' || normalized === 'repeater') return { color: 'var(--accent-light)', bg: 'rgba(124,106,247,0.16)' }
    if (normalized.startsWith('bridge')) return { color: '#e2a24b', bg: 'rgba(226,162,75,0.14)' }
    if (normalized === 'pre-chorus') return { color: '#59b6b0', bg: 'rgba(89,182,176,0.14)' }
    if (normalized.startsWith('verse')) return { color: '#7cb2ff', bg: 'rgba(124,178,255,0.14)' }
    if (normalized === 'outro') return { color: '#c786ff', bg: 'rgba(199,134,255,0.14)' }
    return { color: 'var(--text3)', bg: 'rgba(255,255,255,0.03)' }
  }

  const displayList = activeSetlist
    ? (activeSetlist.songs || []).map(s => songs.find(x => x.id === s.id)).filter(Boolean)
    : songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

console.log('activeSetlist:', activeSetlist)
console.log('activeSetlist.songs:', activeSetlist?.songs)
console.log('all song ids:', songs.map(s => s.id))
console.log('setlist song ids:', activeSetlist?.songs?.map(s => s.id))

  const selectSong = (id) => {
    updatePresenter({ songId: id, sectionIndex: 0, blank: false })
  }

  const goSection = (i) => updatePresenter({ sectionIndex: i, blank: false })

  const prev = () => {
    if (sectionIndex > 0) updatePresenter({ sectionIndex: sectionIndex - 1, blank: false })
  }
  const next = () => {
    if (currentSong && presentationSections.length > 0 && sectionIndex < presentationSections.length - 1) {
      updatePresenter({ sectionIndex: sectionIndex + 1, blank: false })
    }
  }

  return (
    <div className="flex h-full">
      {/* Song list */}
      <div className="w-60 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="p-2 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <input className="input" placeholder="Search songs…"
            value={search} onChange={e => { setSearch(e.target.value); setActiveSetlist(null) }} />
          {setlists.length > 0 && (
            <select className="select w-full text-xs"
              value={activeSetlist?.id || ''}
              onChange={e => {
                const sl = setlists.find(s => s.id === e.target.value)
                setActiveSetlist(sl || null)
                setSearch('')
              }}>
              <option value="">All songs</option>
              {setlists.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
            </select>
          )}
        </div>
        <p className="text-xs px-3 py-1.5" style={{ color: 'var(--text3)' }}>
          {activeSetlist ? `Setlist: ${activeSetlist.name}` : 'All songs'}
        </p>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {displayList.map(song => (
            <div key={song.id}
              onClick={() => selectSong(song.id)}
              className="px-3 py-2 rounded-lg cursor-pointer transition-all"
              style={{
                background: songId === song.id ? 'rgba(124,106,247,0.1)' : 'transparent',
                borderLeft: songId === song.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
              <p className="text-sm font-medium truncate"
                style={{ color: songId === song.id ? 'var(--accent-light)' : 'var(--text)' }}>
                {song.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                Key {song.key} · {song.sections?.length ?? 0} sections
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="w-80 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
        {currentSong ? (
          <>
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>
                {currentSong.title}
              </span>
              <span className="badge text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                {currentSong.key}
              </span>
            </div>
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(124,106,247,0.04)' }}>
              <div className="flex flex-wrap gap-1.5">
                {presentationSections.slice(0, 6).map((sec) => {
                  const accent = getSectionAccent(sec.type)
                  return (
                    <span key={`${sec.type}-${sec.lyrics_en?.slice(0, 4)}`} className="text-[10px] px-2 py-1 rounded-full" style={{ background: accent.bg, color: accent.color }}>
                      {formatSectionLabel(sec.type)}
                    </span>
                  )
                })}
                {presentationSections.length > 6 && (
                  <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                    +{presentationSections.length - 6}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {presentationSections.map((sec, i) => {
                const activeThemeKey = getThemeForSection(presenterState.bgMappings, songId, i, sec.type)
                const activeThemeLabel = BACKGROUND_THEMES.find(theme => theme.key === activeThemeKey)?.name || 'Custom'

                const accent = getSectionAccent(sec.type)

                return (
                  <div key={i}
                    className="p-3 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${sectionIndex === i ? 'var(--accent)' : 'var(--border)'}`,
                      background: sectionIndex === i ? 'rgba(124,106,247,0.08)' : 'var(--bg2)',
                      boxShadow: sectionIndex === i ? '0 10px 24px rgba(124,106,247,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}>
                    <div onClick={() => goSection(i)} className="cursor-pointer mb-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: accent.bg, color: accent.color }}>
                            {formatSectionLabel(sec.type)}
                          </span>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em]"
                            style={{ color: sectionIndex === i ? 'var(--accent-light)' : 'var(--text3)' }}>
                            {sectionIndex === i ? 'Live' : 'Ready'}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: sectionIndex === i ? 'rgba(124,106,247,0.16)' : 'var(--bg3)',
                            color: sectionIndex === i ? 'var(--accent-light)' : 'var(--text3)',
                          }}>
                          {sectionIndex === i ? 'Active' : 'Select'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: 'var(--text2)' }}>
                        {(lang === 'te' ? sec.lyrics_te : sec.lyrics_en)?.split('\n')[0]}
                      </p>
                    </div>

                    <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text3)' }}>
                          Theme
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text2)' }}>
                          {activeThemeLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {BACKGROUND_THEMES.map(theme => {
                          const isActive = activeThemeKey === theme.key

                          return (
                            <button
                              key={theme.key}
                              type="button"
                              onClick={() => {
                                const newMappings = setThemeForSection(
                                  presenterState.bgMappings,
                                  songId,
                                  i,
                                  sec.type,
                                  theme.key
                                )
                                updatePresenter({ bgMappings: newMappings })
                              }}
                              className="btn text-xs rounded-full transition-all min-h-9"
                              style={{
                                background: isActive ? 'linear-gradient(135deg, var(--accent), rgba(124,106,247,0.85))' : 'var(--bg3)',
                                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                                color: isActive ? '#fff' : 'var(--text2)',
                                fontWeight: isActive ? 700 : 500,
                                boxShadow: isActive ? '0 6px 16px rgba(124,106,247,0.24)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <span
                                style={{
                                  width: '0.7rem',
                                  height: '0.7rem',
                                  borderRadius: '999px',
                                  background: theme.gradient,
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  flexShrink: 0,
                                }}
                              />
                              {theme.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Nav controls */}
            <div className="p-2 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn text-xs py-2" onClick={prev}
                  disabled={sectionIndex === 0}>← Prev</button>
                <button className="btn text-xs py-2" onClick={next}
                  disabled={!currentSong || sectionIndex >= presentationSections.length - 1}>Next →</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text3)' }}>Select a song</p>
          </div>
        )}
      </div>

      {/* Right panel — display controls */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Display controls</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: connected ? 'var(--green)' : 'var(--text3)',
                boxShadow: connected ? '0 0 5px var(--green)' : 'none' }} />
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {connected ? 'Display connected' : 'Not connected'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Language */}
          <div>
            <label className="label">Language</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map(l => (
                <button key={l.id}
                  type="button"
                  onClick={() => updatePresenter({ lang: l.id })}
                  className="btn text-xs py-2.5 rounded-full"
                  style={lang === l.id ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff', fontWeight: 700 } : {}}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blank */}
          <div>
            <label className="label">Screen</label>
            <button
              type="button"
              onClick={() => updatePresenter({ blank: !blank })}
              className="btn w-full py-2.5 text-sm rounded-full"
              style={blank ? { background: 'var(--red)', borderColor: 'var(--red)', color: '#fff', fontWeight: 700 } :
                { borderColor: 'rgba(248,113,113,0.3)', color: 'var(--red)', fontWeight: 600 }}>
              {blank ? 'Blank (click to restore)' : 'Blank screen'}
            </button>
          </div>

          {/* Live preview */}
          <div>
            <label className="label">Live preview</label>
            <div className="rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-48"
              style={{ background: '#111', border: '1px solid #222' }}>
              {blank ? (
                <span className="text-sm" style={{ color: '#333' }}>Screen is blank</span>
              ) : currentSection ? (
                <>
                  <p className="text-xs mb-3" style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {currentSection.type}
                  </p>
                  <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#ddd' }}>
                    {getSectionLyrics(currentSection, lang)}
                  </p>
                  {lang === 'both' && currentSection.lyrics_te && (
                    <p className="text-sm leading-relaxed whitespace-pre-line mt-3 italic" style={{ color: '#888' }}>
                      {currentSection.lyrics_te}
                    </p>
                  )}
                  <p className="text-xs mt-4" style={{ color: '#444' }}>
                    {currentSong?.title} · {currentSong?.key}
                  </p>
                </>
              ) : (
                <span className="text-sm" style={{ color: '#333' }}>No song selected</span>
              )}
            </div>
          </div>

          <div>
            <a href="/display" target="_blank" rel="noreferrer" className="btn w-full text-xs text-center block py-2">
              Open display in new window ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
