import { redirect } from 'next/navigation'

export default function ChannelsPage() {
  // This route exists to keep stable navigation links.
  // Redirect to the canonical channels page.
  redirect('/dashboard/facebook/channels')
}

