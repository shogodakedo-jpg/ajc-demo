import Navbar from './Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Navbar />
      {/* PC: サイドバー分の左マージン */}
      <main className="flex-1 lg:ml-56">
        {/* タブレット縦向き・スマホ: 上部バー分の上パディング */}
        <div className="pt-16 lg:pt-0 px-4 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
