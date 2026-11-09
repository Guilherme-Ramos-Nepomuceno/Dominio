import { redirect } from "next/navigation"

// O onboarding agora é o guiado na própria tela Planejar.
export default function OnboardingPage() {
  redirect("/plan")
}
