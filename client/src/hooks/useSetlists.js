import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useSocket } from '../context/SocketContext'

export function useSetlists() {
  const [setlists, setSetlists] = useState([])
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()

  const fetchSetlists = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/setlists')
      setSetlists(data)
    } catch (e) {
      console.error('Failed to fetch setlists', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSetlists() }, [fetchSetlists])

  useEffect(() => {
    const s = socket?.current
    if (!s) return
    s.on('setlists:updated', fetchSetlists)
    return () => s.off('setlists:updated', fetchSetlists)
  }, [socket, fetchSetlists])

const saveSetlist = async (setlist) => {
  const payload = { name: setlist.name, date: setlist.date || '', songIds: setlist.songs.map(s => s.id) }
  if (setlist.id && !setlist.id.startsWith('new-')) {
    await axios.put(`/api/setlists/${setlist.id}`, payload)
    await fetchSetlists()
    return { id: setlist.id }
  } else {
    const { data } = await axios.post('/api/setlists', payload)
    await fetchSetlists()
    return data // { id, name, date }
  }
}

  const deleteSetlist = async (id) => {
    await axios.delete(`/api/setlists/${id}`)
    await fetchSetlists()
  }

  return { setlists, loading, fetchSetlists, saveSetlist, deleteSetlist }
}
