import { Suspense } from "react"
import { SavingsView } from "./components/savings-view"

export default function SavingsPage() {
  // useSearchParams (a visão ?view=invested) pede Suspense no build.
  return (
    <Suspense fallback={null}>
      <SavingsView />
    </Suspense>
  )
}
