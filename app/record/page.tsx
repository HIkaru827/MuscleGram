import RecordScreen from "@/components/record-screen"

// Disable static generation for this page since it requires client-side context
export const dynamic = 'force-dynamic'

export default function RecordPage() {
  return <RecordScreen />
}