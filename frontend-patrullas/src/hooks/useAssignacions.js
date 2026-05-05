// frontend-patrulles/src/hooks/useAssignacions.js

import { useEffect, useContext, useCallback } from 'react'
import { SocketContext } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'
import { alertarAssignacio, demanarPermisNotificacions } from '../utils/notificacions'

function useAssignacions() {
  const { getSocket, connectat } = useContext(SocketContext)
  const { indicatiu, dispatch } = useContext(AuthContext)

  // ─── Sol·licitar permís de notificació un cop ─────────────────
  useEffect(() => {
    demanarPermisNotificacions()
  }, [])

  // ─── Handler per nova assignació ──────────────────────────────
  const handleNovaAssignacio = useCallback((data) => {
    console.log('🚨 Event rebut: incidencia_assignada', data)

    // Comprovem si l'assignació és per al nostre indicatiu
    const assignacio = data.assignacio
    const incidenciaRebuda = data.incidencia
    const indicatiuRebut = data.indicatiu

    if (!assignacio || !indicatiu) return

    // Filtrem: només ens interessa si l'indicatiu_id coincideix amb el nostre
    const esPerAMi =
      assignacio.indicatiu_id === indicatiu.id ||
      indicatiuRebut?.id === indicatiu.id

    if (!esPerAMi) {
      console.log('ℹ️ Assignació per a un altre indicatiu, ignorant')
      return
    }

    console.log('✅ Assignació per a nosaltres!')

    // Actualitzar l'indicatiu al context amb la incidència assignada
    const indicatiuActualitzat = {
      ...indicatiu,
      incidencia_assignada_id: assignacio.incidencia_id,
      estat_operatiu: 'en_servei',
    }

    localStorage.setItem('indicatiu', JSON.stringify(indicatiuActualitzat))
    dispatch({ type: 'SET_INDICATIU', payload: indicatiuActualitzat })

    // Alertar l'usuari
    alertarAssignacio(incidenciaRebuda, indicatiuRebut)

  }, [indicatiu, dispatch])

  // ─── Handler per assignació acceptada ─────────────────────────
  const handleAssignacioAcceptada = useCallback((data) => {
    console.log('✅ Event rebut: assignacio_acceptada', data)
  }, [])

  // ─── Handler per canvi d'estat d'incidència ───────────────────
  const handleCanviEstatIncidencia = useCallback((data) => {
    console.log('📋 Event rebut: canvi_estat_incidencia', data)

    // Si la incidència s'ha resolt o tancat, netejar l'assignació
    if (!indicatiu) return

    const { incidencia_id, estat_nou } = data
    if (
      incidencia_id === indicatiu.incidencia_assignada_id &&
      (estat_nou === 'resolta' || estat_nou === 'tancada')
    ) {
      const indicatiuActualitzat = {
        ...indicatiu,
        incidencia_assignada_id: null,
        estat_operatiu: 'disponible',
      }

      localStorage.setItem('indicatiu', JSON.stringify(indicatiuActualitzat))
      dispatch({ type: 'SET_INDICATIU', payload: indicatiuActualitzat })

      console.log('✅ Incidència resolta/tancada, indicatiu alliberat')
    }
  }, [indicatiu, dispatch])

  // ─── Subscriure's als events del socket ───────────────────────
  useEffect(() => {
    if (!connectat || !indicatiu) return

    const socket = getSocket()
    if (!socket) return

    console.log('🔔 Escoltant events d\'assignació per indicatiu:', indicatiu.codi)

    // Registrar listeners
    socket.on('incidencia_assignada', handleNovaAssignacio)
    socket.on('assignacio_acceptada', handleAssignacioAcceptada)
    socket.on('canvi_estat_incidencia', handleCanviEstatIncidencia)

    // Cleanup: eliminar listeners quan canviï la connexió o l'indicatiu
    return () => {
      socket.off('incidencia_assignada', handleNovaAssignacio)
      socket.off('assignacio_acceptada', handleAssignacioAcceptada)
      socket.off('canvi_estat_incidencia', handleCanviEstatIncidencia)
    }
  }, [connectat, indicatiu, getSocket, handleNovaAssignacio, handleAssignacioAcceptada, handleCanviEstatIncidencia])

  return null // Aquest hook no retorna res, només escolta
}

export default useAssignacions