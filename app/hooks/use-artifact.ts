"use client"

import { create } from 'zustand'

export interface ArtifactState {
  isVisible: boolean
  setVisible: (isVisible: boolean) => void
  toggleVisible: () => void
}

export const useArtifactSelector = create<ArtifactState>((set) => ({
  isVisible: false,
  setVisible: (isVisible: boolean) => set({ isVisible }),
  toggleVisible: () => set((state: ArtifactState) => ({ isVisible: !state.isVisible })),
})) 