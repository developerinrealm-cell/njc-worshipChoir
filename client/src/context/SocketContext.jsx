import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [presenterState, setPresenterState] = useState({
    songId: null, sectionIndex: 0, lang: 'en', blank: false,
    bgMappings: {
    verse: 'chocolate',
    chorus: 'sunset',
    bridge: 'ocean',
    default: 'violet',
  },
  })

  useEffect(() => {
    const socket = io('/', { query: { room: 'main' } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('presenter:state', (state) => setPresenterState(state))

    return () => socket.disconnect()
  }, [])

const updatePresenter = (patch) => {
  const next = {
    ...presenterState,
    ...patch,
    bgMappings: {
      ...presenterState.bgMappings,
      ...(patch.bgMappings || {}),
    },
  }

  setPresenterState(next)

  // Emit the FULL merged state for bgMappings, not just the patch
  socketRef.current?.emit('presenter:update', {
    ...patch,
    bgMappings: next.bgMappings,
  })
}


  return (
    <SocketContext.Provider value={{ connected, presenterState, updatePresenter, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
