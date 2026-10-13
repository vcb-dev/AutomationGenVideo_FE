export default function TaskAutoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        {children}
      </div>
    </div>
  )
}
