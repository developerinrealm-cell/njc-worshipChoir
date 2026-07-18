import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useSocket } from '../context/SocketContext'

export function useSongs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()

  const fetchSongs = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/songs')
      setSongs(data)
    } catch (e) {
      console.error('Failed to fetch songs', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  // Refresh when server emits songs:updated
  useEffect(() => {
    const s = socket?.current
    if (!s) return

    const handleSongsUpdated = () => {
      fetchSongs()
    }

    s.on('songs:updated', handleSongsUpdated)
    return () => s.off('songs:updated', handleSongsUpdated)
  }, [socket, fetchSongs])

  const saveSong = async (song) => {
    if (song.id && !song.id.startsWith('new-')) {
      const { data } = await axios.put(`/api/songs/${song.id}`, song)
      return data
    } else {
      const { data } = await axios.post('/api/songs', song)
      return data
    }
  }

  const deleteSong = async (id) => {
    await axios.delete(`/api/songs/${id}`)
    await fetchSongs()
  }

  return { songs, loading, fetchSongs, saveSong, deleteSong }
}
