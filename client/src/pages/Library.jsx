import { useState, useEffect } from 'react'
import { useSongs } from '../hooks/useSongs'
import axios from 'axios'

const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
const SECTION_TYPES = [
  ...Array.from({ length: 20 }, (_, i) => `Verse ${i + 1}`),
  'Chorus',
  'Pre-Chorus',
  'Bridge',
  'Bridge 1',
  'Bridge 2',
  'Intro',
  'Outro',
  'Tag',
  'Repeater'
]

function SectionCard({ section, index, onChange, onRemove }) {
  const canRemove = index > 0
  const isCustomType = section.type && !SECTION_TYPES.includes(section.type)

  return (
    <div className="rounded-xl border transition-all" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: 'rgba(124,106,247,0.07)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
            #{index + 1}
          </span>
          <select className="select text-xs h-8 flex-1 max-w-[180px]"
            value={isCustomType ? 'Custom' : section.type}
            onChange={e => {
              if (e.target.value === 'Custom') {
                onChange(index, 'type', '')
              } else {
                onChange(index, 'type', e.target.value)
              }
            }}>
            {SECTION_TYPES.map(t => <option key={t}>{t}</option>)}
            <option value="Custom">Custom…</option>
          </select>
          {isCustomType ? (
            <input
              className="input text-xs h-8 flex-1 min-w-[120px]"
              placeholder="Custom section"
              value={section.type}
              onChange={e => onChange(index, 'type', e.target.value)}
            />
          ) : null}
        </div>
        <button
          className="btn-ghost text-xs px-2 py-1 rounded-full"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          style={{ color: canRemove ? 'var(--red)' : 'var(--text3)', opacity: canRemove ? 1 : 0.6 }}>
          {canRemove ? 'Remove' : 'Locked'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        <div>
          <label className="label mb-1.5">English lyrics</label>
          <textarea className="textarea w-full" rows={4}
            placeholder="English lyrics..."
            value={section.lyrics_en || ''}
            onChange={e => onChange(index, 'lyrics_en', e.target.value)} />
        </div>
        <div>
          <label className="label mb-1.5">Telugu lyrics</label>
          <textarea className="textarea w-full" rows={4}
            placeholder="Telugu lyrics..."
            value={section.lyrics_te || ''}
            onChange={e => onChange(index, 'lyrics_te', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function Library() {
  const { songs, loading, saveSong, deleteSong, fetchSongs } = useSongs()
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [bulkImportMode, setBulkImportMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLang, setBulkLang] = useState('en') // 'en' or 'te'
  const [bulkFormat, setBulkFormat] = useState('standard') // 'standard' or 'hymnbook'
  const [bulkQueue, setBulkQueue] = useState([]) // Queue for batch import
  const [bulkQueueMode, setBulkQueueMode] = useState(false) // Show queue UI
  const [bulkImporting, setBulkImporting] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result
        if (typeof content === 'string') {
          // Split file into individual songs - separated by multiple newlines or dashes
          const songs = content.split(/\n-{5,}\n|(\n\n\n+)/).filter(s => s && s.trim())
          if (songs.length === 0) {
            showToast('No songs found in file')
            return
          }
          setBulkQueue(songs.map(lyric => ({ 
            lyric: lyric.trim(), 
            title: extractTitleFromLyrics(lyric),
            status: 'pending' 
          })))
          setBulkQueueMode(true)
          showToast(`Loaded ${songs.length} song(s) from file`)
        }
      } catch (err) {
        showToast('Error reading file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Import one song from queue
  const cancelBulkImport = () => {
    setBulkImporting(false)
    setBulkQueue([])
    setBulkQueueMode(false)
    setBulkImportMode(false)
    setBulkText('')
    showToast('Bulk import cancelled')
  }

  const importNextFromQueue = async () => {
    if (bulkImporting) return

    setBulkImporting(true)
    try {
      if (bulkQueue.length === 0) {
        setBulkQueueMode(false)
        setBulkImportMode(false)
        setBulkText('')
        showToast('All songs imported!')
        return
      }

      const song = bulkQueue[0]
      const sections = parseBulkLyrics(song.lyric)

      if (sections.length === 0) {
        showToast(`Skipped "${song.title}" - no valid sections`)
        setBulkQueue(q => q.slice(1))
        return
      }

      const newDraft = {
        id: `new-${Date.now()}`,
        title: song.title || 'Untitled song',
        key: 'C',
        author: '',
        sections: sections
      }

      const saved = await saveSong(newDraft)
      await fetchSongs()

      setDraft(saved)
      setSelected(saved.id)
      setBulkQueue(q => q.slice(1))
      showToast(`Imported "${saved.title || 'song'}"`)

      if (bulkQueue.length === 1) {
        setBulkQueueMode(false)
        setBulkImportMode(false)
        setBulkText('')
      }
    } catch (error) {
      console.error('Bulk import error:', error)
      showToast('Bulk import failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setBulkImporting(false)
    }
  }

  const importAllFromQueue = async () => {
    if (bulkImporting || bulkQueue.length === 0) return

    setBulkImporting(true)
    try {
      let remainingQueue = [...bulkQueue]

      while (remainingQueue.length > 0) {
        const current = remainingQueue[0]
        const sections = parseBulkLyrics(current.lyric)

        if (sections.length > 0) {
          const newDraft = {
            id: `new-${Date.now()}-${remainingQueue.length}`,
            title: current.title || 'Untitled song',
            key: 'C',
            author: '',
            sections,
          }

          await saveSong(newDraft)
          await fetchSongs()
        }

        remainingQueue = remainingQueue.slice(1)
        setBulkQueue(remainingQueue)
      }

      setBulkQueueMode(false)
      setBulkImportMode(false)
      setBulkText('')
      showToast('All songs imported successfully')
    } catch (error) {
      console.error('Bulk import all error:', error)
      showToast('Bulk import failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setBulkImporting(false)
    }
  }

  // Parse traditional Telugu hymnbook format
  const parseHymnbookFormat = (text) => {
    const sections = []
    const lines = text.split('\n')
    let pallavi = null
    let currentVerseNum = null
    let currentLyrics = []
    const verseMap = {} // Store verses temporarily
    let firstVerseContent = [] // Capture opening lines before first numbered verse
    let foundFirstMarker = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines
      
      // Detect pallavi (chorus)
      if (line.includes('పల్లవి:') || line.toLowerCase().includes('pallavi')) {
        foundFirstMarker = true
        if (pallavi === null) {
          // Extract pallavi lines - first check if there's text on the same line
          let pallaviLines = []
          
          // Extract text after పల్లవి: on the same line
          const pallaviMatch = line.match(/[పూ]ల్లవి:\s*(.+)/i)
          if (pallaviMatch && pallaviMatch[1].trim()) {
            const sameLineText = pallaviMatch[1].trim()
            if (!sameLineText.match(/^॥\d+॥$/) && !sameLineText.match(/^\|\|.+\|\|$/)) {
              pallaviLines.push(sameLineText)
            }
          }
          
          // Then continue reading subsequent lines
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim()
            if (!nextLine) continue
            if (nextLine.match(/^\d+\./) || nextLine.includes('పల్లవి:')) break
            // Skip repetition markers
            if (!nextLine.match(/^॥\d+॥$/) && !nextLine.match(/^\|\|.+\|\|$/)) {
              pallaviLines.push(nextLine)
            }
          }
          pallavi = pallaviLines.join('\n').trim()
        }
        continue
      }

      // Detect numbered verses (1., 2., 3., etc.)
      const verseMatch = line.match(/^(\d+)\./)
      if (verseMatch) {
        foundFirstMarker = true
        const verseNum = verseMatch[1]
        // Save any previous verse content
        if (currentVerseNum !== null && currentLyrics.length > 0) {
          verseMap[currentVerseNum] = currentLyrics.join('\n').trim()
        }
        // If this is verse 1 and we have opening content, save it first
        if (verseNum === '1' && firstVerseContent.length > 0) {
          verseMap['0'] = firstVerseContent.join('\n').trim() // Temporary key for opening verse
        }
        currentVerseNum = verseNum
        currentLyrics = []
        // Get verse content
        const verseContent = line.substring(line.indexOf('.') + 1).trim()
        if (verseContent) {
          currentLyrics.push(verseContent)
        }
      } else if (!foundFirstMarker && line && !line.includes('પલ્લવી:')) {
        // Capture opening lines before first numbered verse
        if (!line.match(/^॥\d+॥$/) && !line.match(/^\|\|.+\|\|$/) && !line.match(/^-+$/)) {
          firstVerseContent.push(line)
        }
      } else if (currentVerseNum !== null && line && !line.includes('પલ્લવી:')) {
        // Skip repetition markers and empty lines
        if (!line.match(/^॥\d+॥$/) && !line.match(/^\|\|.+\|\|$/) && !line.match(/^-+$/)) {
          currentLyrics.push(line)
        }
      }
    }

    // Save last verse
    if (currentVerseNum !== null && currentLyrics.length > 0) {
      verseMap[currentVerseNum] = currentLyrics.join('\n').trim()
    }

    // Create sections: opening verses first, then Chorus, then numbered verses
    // If we have opening verse content (before first numbered verse)
    if (verseMap['0']) {
      sections.push({
        type: 'Verse 1',
        lyrics_en: bulkLang === 'en' ? verseMap['0'] : '',
        lyrics_te: bulkLang === 'te' ? verseMap['0'] : ''
      })
    }

    if (pallavi) {
      sections.push({
        type: 'Chorus',
        lyrics_en: bulkLang === 'en' ? pallavi : '',
        lyrics_te: bulkLang === 'te' ? pallavi : ''
      })
    }

    // Add numbered verses in order (starting from 1)
    for (const verseNum of Object.keys(verseMap).sort((a, b) => parseInt(a) - parseInt(b))) {
      if (verseNum === '0') continue // Skip the opening verse as it's already added
      const verseLabel = verseMap['0'] ? parseInt(verseNum) + 1 : verseNum // Offset numbering if opening verse exists
      sections.push({
        type: `Verse ${verseLabel}`,
        lyrics_en: bulkLang === 'en' ? verseMap[verseNum] : '',
        lyrics_te: bulkLang === 'te' ? verseMap[verseNum] : ''
      })
    }

    return sections
  }

  // Parse standard [Section] format
  const parseStandardFormat = (text) => {
    const sections = []
    const lines = text.split('\n')
    let currentSection = null
    let currentLyrics = []

    const normalizeSectionType = (rawType) => {
      const value = rawType.trim().toLowerCase()
      if (['repeater', 'repeat', 'refrain', 'response', 'response line', 'tag'].includes(value)) {
        return 'Repeater'
      }
      if (value === 'pre-chorus' || value === 'prechorus') {
        return 'Pre-Chorus'
      }
      if (value === 'bridge 1' || value === 'bridge1') {
        return 'Bridge 1'
      }
      if (value === 'bridge 2' || value === 'bridge2') {
        return 'Bridge 2'
      }
      if (value === 'outro') {
        return 'Outro'
      }
      if (value === 'intro') {
        return 'Intro'
      }
      if (value === 'chorus') {
        return 'Chorus'
      }
      if (value.startsWith('verse')) {
        return rawType.trim()
      }
      return rawType.trim()
    }

    for (const line of lines) {
      const sectionMatch = line.match(/^\[(.*?)\]$/);
      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          sections.push({
            type: normalizeSectionType(currentSection),
            lyrics_en: bulkLang === 'en' ? currentLyrics.join('\n').trim() : '',
            lyrics_te: bulkLang === 'te' ? currentLyrics.join('\n').trim() : ''
          })
        }
        currentSection = sectionMatch[1].trim()
        currentLyrics = []
      } else if (currentSection && line.trim()) {
        currentLyrics.push(line)
      }
    }

    // Save last section
    if (currentSection) {
      sections.push({
        type: normalizeSectionType(currentSection),
        lyrics_en: bulkLang === 'en' ? currentLyrics.join('\n').trim() : '',
        lyrics_te: bulkLang === 'te' ? currentLyrics.join('\n').trim() : ''
      })
    }

    return sections
  }

  const parseBulkLyrics = (text) => {
    if (bulkFormat === 'hymnbook') {
      return parseHymnbookFormat(text)
    } else {
      return parseStandardFormat(text)
    }
  }

  const extractTitleFromLyrics = (text) => {
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines, section markers, and repetition markers
      if (trimmed && 
          !trimmed.match(/^\[/) && 
          !trimmed.includes('పల్లవి:') && 
          !trimmed.includes('pallavi') &&
          !trimmed.match(/^\d+\./) &&
          !trimmed.match(/^॥\d+॥$/) &&
          !trimmed.match(/^\|\|/) &&
          !trimmed.match(/^-+$/)) {
        return trimmed.substring(0, 50) // Limit to 50 chars for title
      }
    }
    return ''
  }

  const applyBulkImport = () => {
    if (!bulkText.trim()) {
      showToast('Paste some lyrics first')
      return
    }
    const parsed = parseBulkLyrics(bulkText)
    if (parsed.length === 0) {
      showToast('No sections found. Use format: [Section Name]')
      return
    }
    // Validate sections have at least one with lyrics
    const hasLyrics = parsed.some(s => 
      (s.lyrics_en && s.lyrics_en.trim()) || (s.lyrics_te && s.lyrics_te.trim())
    )
    if (!hasLyrics) {
      showToast('Sections must contain lyrics')
      return
    }
    // Auto-fill title if empty
    const autoTitle = !draft.title.trim() ? extractTitleFromLyrics(bulkText) : draft.title
    setDraft(d => ({ ...d, sections: parsed, title: autoTitle }))
    setBulkText('')
    setBulkImportMode(false)
    showToast(`Imported ${parsed.length} sections with auto-title!`)
  }

  const filtered = songs.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

  const openSong = (song) => {
    setSelected(song.id)
    setDraft(JSON.parse(JSON.stringify(song)))
  }

  const newSong = () => {
    const blank = { id: `new-${Date.now()}`, title: '', key: 'C', author: '', sections: [
      { type: 'Verse 1', lyrics_en: '', lyrics_te: '' }
    ]}
    setSelected(blank.id)
    setDraft(blank)
  }

  const updateField = (field, value) => setDraft(d => ({ ...d, [field]: value }))

  const updateSection = (i, field, value) => {
    setDraft(d => {
      const sections = [...d.sections]
      sections[i] = { ...sections[i], [field]: value }
      return { ...d, sections }
    })
  }

  const addSection = () => {
    setDraft(d => ({ ...d, sections: [...d.sections, { type: 'Chorus', lyrics_en: '', lyrics_te: '' }] }))
  }

  const removeSection = (i) => {
    if (draft.sections.length === 1) return
    setDraft(d => ({ ...d, sections: d.sections.filter((_, idx) => idx !== i) }))
  }

  const handleSave = async () => {
    if (!draft.title.trim()) { showToast('Please add a title'); return }
    if (!draft.sections || draft.sections.length === 0) { showToast('Add at least one section'); return }
    setSaving(true)
    try {
      const saved = await saveSong(draft)
      setSelected(saved.id)
      setDraft(saved)
      showToast('Saved!')
    } catch (e) {
      console.error('Save error:', e)
      showToast('Save failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!draft || draft.id.startsWith('new-')) return
    if (!window.confirm(`Delete "${draft.title}"?`)) return
    await deleteSong(draft.id)
    setDraft(null)
    setSelected(null)
    showToast('Deleted')
  }

  const handleExportBackup = () => {
    if (!songs || songs.length === 0) {
      showToast('No songs to export')
      return
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      songs: songs.map(song => ({
        id: song.id,
        title: song.title,
        key: song.key,
        author: song.author,
        sections: (song.sections || []).map(section => ({
          type: section.type,
          lyrics_en: section.lyrics_en || '',
          lyrics_te: section.lyrics_te || ''
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `worship-presenter-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast('Backup downloaded')
  }

  const handleRestoreBackup = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const content = event.target?.result
      const payload = JSON.parse(content)
      const songsToRestore = payload.songs || payload // supports both {songs:[...]} and a raw array

      if (!Array.isArray(songsToRestore) || songsToRestore.length === 0) {
        showToast('No songs found in that file')
        return
      }

      if (!window.confirm(`Restore ${songsToRestore.length} song(s) from backup? Existing songs with the same ID will be overwritten.`)) {
        return
      }

      const { data } = await axios.post('/api/songs/restore', { songs: songsToRestore })
      await fetchSongs()
      showToast(`Restored ${data.count} song(s)!`)
    } catch (err) {
      console.error('Restore error:', err)
      showToast('Restore failed: ' + (err.response?.data?.error || err.message))
    }
  }
  reader.readAsText(file)
}

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Library</p>
              <p className="text-[11px]" style={{ color: 'var(--text3)' }}>Manage songs and lyrics</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button className="btn text-xs px-2.5 py-1.5 rounded-full" onClick={handleExportBackup}>Backup</button>
<label className="btn text-xs px-2.5 py-1.5 rounded-full cursor-pointer text-center">
  Restore
  <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
</label>
              <button className="btn-primary text-xs px-2.5 py-1.5 rounded-full" onClick={newSong}>+ New</button>
            </div>
          </div>
          <input className="input w-full" placeholder="Search songs..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {loading && <p className="text-xs p-2" style={{ color: 'var(--text3)' }}>Loading…</p>}
          {filtered.map(song => (
            <div key={song.id}
              onClick={() => openSong(song)}
              className="px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: selected === song.id ? 'rgba(124,106,247,0.12)' : 'transparent',
                border: selected === song.id ? '1px solid var(--accent)' : '1px solid transparent',
                boxShadow: selected === song.id ? '0 8px 20px rgba(124,106,247,0.12)' : 'none',
              }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate" style={{ color: selected === song.id ? 'var(--accent-light)' : 'var(--text)' }}>
                  {song.title || 'Untitled'}
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                  {song.key || 'C'}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                {song.sections?.length ?? 0} sections • {song.author ? song.author : 'No author'}
              </p>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-xs p-2 text-center" style={{ color: 'var(--text3)' }}>No songs found</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!draft ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text3)' }}>
            <p className="text-sm">Select a song or add a new one</p>
            <button className="btn-primary" onClick={newSong}>+ New song</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(124,106,247,0.04)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {draft.title || 'New song'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>
                  {draft.sections?.length || 0} sections • Key {draft.key || 'C'}
                </p>
              </div>
              <button className="btn-danger text-xs rounded-full px-3 py-1.5" onClick={handleDelete}>Delete</button>
              <button className="btn-primary text-xs rounded-full px-3 py-1.5" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Meta fields */}
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">Title</label>
                    <input className="input" placeholder="Song title"
                      value={draft.title} onChange={e => updateField('title', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Key</label>
                    <select className="select w-full" value={draft.key} onChange={e => updateField('key', e.target.value)}>
                      {KEYS.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Author / Copyright</label>
                  <input className="input" placeholder="e.g. John Newton, 1779"
                    value={draft.author} onChange={e => updateField('author', e.target.value)} />
                </div>
              </div>

              {/* Sections */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="label mb-0">Sections</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>Build the song flow section by section</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    className={`btn text-xs px-3 py-1.5 rounded-full ${bulkImportMode ? 'btn-primary' : 'btn'}`}
                    onClick={() => setBulkImportMode(!bulkImportMode)}
                  >
                    {bulkImportMode ? '✓ Bulk mode' : 'Bulk import'}
                  </button>
                  {!bulkImportMode && (
                    <button className="btn-primary text-xs px-3 py-1.5 rounded-full" onClick={addSection}>+ Add section</button>
                  )}
                </div>
              </div>
              {bulkImportMode ? (
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'rgba(124,106,247,0.05)' }}>
                  <div className="mb-4">
                    <label className="label text-xs">Format type</label>
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        className={`btn text-xs px-3 py-1.5 rounded-full ${bulkFormat === 'standard' ? 'btn-primary' : 'btn'}`}
                        onClick={() => setBulkFormat('standard')}
                      >
                        Standard [Section]
                      </button>
                      <button 
                        className={`btn text-xs px-3 py-1.5 rounded-full ${bulkFormat === 'hymnbook' ? 'btn-primary' : 'btn'}`}
                        onClick={() => setBulkFormat('hymnbook')}
                      >
                        Hymnbook format
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>Example format</p>
                    {bulkFormat === 'standard' ? (
                      <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
{`[Verse 1]
First line of verse
Second line of verse

[Chorus]
Chorus line 1
Chorus line 2`}
                      </p>
                    ) : (
                      <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
{`పల్లవి: Chorus/Pallavi
Chorus line 1

1. First numbered verse
Verse 1 line 1

2. Second numbered verse
Verse 2 line 1`}
                      </p>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="label text-xs">Language</label>
                    <div className="flex gap-2">
                      <button 
                        className={`btn text-xs px-3 py-1.5 rounded-full ${bulkLang === 'en' ? 'btn-primary' : 'btn'}`}
                        onClick={() => setBulkLang('en')}
                      >
                        English
                      </button>
                      <button 
                        className={`btn text-xs px-3 py-1.5 rounded-full ${bulkLang === 'te' ? 'btn-primary' : 'btn'}`}
                        onClick={() => setBulkLang('te')}
                      >
                        Telugu
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="label text-xs mb-2">Import source</label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition"
                      style={{ color: 'var(--text2)', borderColor: 'var(--border)', background: 'var(--bg2)' }}>
                      <span className="text-sm">📁 Upload .txt file</span>
                      <input 
                        type="file" 
                        accept=".txt" 
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>

                  <p className="text-xs mb-2" style={{ color: 'var(--text3)' }}>Or paste lyrics below:</p>
                  <textarea 
                    className="textarea w-full"
                    rows={10}
                    placeholder={`[Verse 1]\nYour English lyrics...\n\n[Chorus]\nChorus lyrics here...`}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                  />

                  {bulkQueueMode ? (
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex gap-2">
                        <button 
                          className="btn-primary flex-1 text-sm rounded-full"
                          onClick={importNextFromQueue}
                          disabled={bulkImporting}
                        >
                          {bulkImporting ? 'Saving…' : `Import next (${bulkQueue.length} left)`}
                        </button>
                        <button 
                          className="btn text-sm px-3 rounded-full"
                          onClick={cancelBulkImport}
                          disabled={bulkImporting}
                        >
                          Cancel
                        </button>
                      </div>
                      <button 
                        className="btn text-sm rounded-full"
                        onClick={importAllFromQueue}
                        disabled={bulkImporting || bulkQueue.length === 0}
                      >
                        {bulkImporting ? 'Importing all…' : `Import all (${bulkQueue.length})`}
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn-primary w-full text-sm mt-3 rounded-full"
                      onClick={applyBulkImport}
                    >
                      Import sections
                    </button>
                  )}

                  {bulkQueueMode && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>
                          Import queue
                        </p>
                        <button className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'var(--bg2)', color: 'var(--text2)' }} onClick={cancelBulkImport} disabled={bulkImporting}>
                          Stop import
                        </button>
                      </div>
                      <div className="text-[11px] mb-2" style={{ color: 'var(--text3)' }}>
                        Progress: {bulkQueue.length > 0 ? `${Math.max(0, bulkQueue.length)} remaining` : 'Complete'}
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {bulkQueue.map((song, i) => (
                          <div key={i} className="text-xs px-2 py-1 mb-1 rounded" style={{ background: 'rgba(124,106,247,0.1)', color: 'var(--text2)' }}>
                            {i + 1}. {song.title || 'Untitled'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!bulkQueueMode && bulkText && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>
                        Preview: {parseBulkLyrics(bulkText).length} section(s) found
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parseBulkLyrics(bulkText).map((sec, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(124,106,247,0.2)', color: 'var(--accent-light)' }}>
                            {sec.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {draft.sections.map((sec, i) => (
                    <SectionCard key={i} section={sec} index={i}
                      onChange={updateSection} onRemove={removeSection} />
                  ))}
                </>
              )}
            </div>

            {/* Preview bar */}
            <div className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)', background: 'rgba(17,17,17,0.95)' }}>
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text3)' }}>Live preview</span>
              <span className="text-sm flex-1 truncate" style={{ color: '#ddd' }}>
                {draft.sections[0]?.lyrics_en?.split('\n')[0] || 'Add lyrics to see a preview here'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 text-sm px-4 py-2 rounded-lg z-50"
          style={{ background: 'var(--green)', color: '#fff' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
