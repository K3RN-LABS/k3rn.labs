import { redirect } from 'next/navigation'

// Cookie + redirect handled in middleware — this page is a fallback only
export default function InvitePage() {
  redirect('/')
}
