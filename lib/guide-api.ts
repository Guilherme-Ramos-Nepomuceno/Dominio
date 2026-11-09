// Progresso do guiado na API (por pessoa: quem fez login, não a conta ativa).

import { fetchApi } from "./api"
import { mapGuideState, type GuideState } from "./guide"

export interface GuidePatch {
  tour: string
  ack?: string[]
  done?: boolean
  skipped?: boolean
  reset?: boolean
}

export async function getGuide(): Promise<GuideState> {
  return mapGuideState(await fetchApi("/guide"))
}

export async function patchGuide(patch: GuidePatch): Promise<GuideState> {
  return mapGuideState(await fetchApi("/guide", { method: "PATCH", body: JSON.stringify(patch) }))
}
