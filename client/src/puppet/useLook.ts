// The child's Pulpito for a component: every one on screen follows a change at once.
import { useSyncExternalStore } from 'react'
import { currentLook, serverLook, subscribeLook, type PulpitoLook } from '../zoo/pulpitoLook'

export function usePulpitoLook(): PulpitoLook {
  return useSyncExternalStore(subscribeLook, currentLook, serverLook)
}
