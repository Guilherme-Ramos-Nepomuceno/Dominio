import { JoinView } from "./components/join-view"

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <JoinView token={token} />
}
