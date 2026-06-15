'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'

const staffNavItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/reports', label: '日報一覧', icon: '📋' },
  { href: '/reports/new', label: '日報入力', icon: '✏️' },
  { href: '/monthly', label: '月次集計', icon: '📊' },
  { href: '/admin/products', label: '商品マスタ', icon: '🛒' },
  { href: '/admin/members', label: '氏名マスタ', icon: '👤' },
]

const adminNavItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/reports', label: '日報一覧', icon: '📋' },
  { href: '/reports/new', label: '日報入力', icon: '✏️' },
  { href: '/monthly', label: '月次集計', icon: '📊' },
  { href: '/admin/products', label: '商品マスタ', icon: '🛒' },
  { href: '/admin/members', label: '氏名マスタ', icon: '👤' },
  { href: '/admin/stores', label: '店舗管理', icon: '🏪' },
  { href: '/admin/users', label: 'ユーザー管理', icon: '👥' },
]

interface NavItem { href: string; label: string; icon: string }

function NavLinks({ items, pathname, onClose }: { items: NavItem[]; pathname: string; onClose?: () => void }) {
  return (
    <>
      {items.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 text-base transition-colors ${
              isActive
                ? 'bg-blue-700 text-white font-semibold'
                : 'text-blue-100 hover:bg-blue-800'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const { profile, isAdmin } = useProfile()
  const navItems = isAdmin ? adminNavItems : staffNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* PC / タブレット横向き: サイドバー */}
      <nav className="hidden lg:flex flex-col w-56 bg-blue-900 text-white min-h-screen fixed left-0 top-0 z-50">
        <div className="px-4 py-5 border-b border-blue-700">
          <div className="text-lg font-bold leading-tight">AJC 業務管理</div>
          {profile?.store_name && (
            <div className="text-xs text-blue-300 mt-1">{profile.store_name}</div>
          )}
          {profile && (
            <div className="text-xs text-blue-300 mt-0.5">
              {isAdmin ? '管理者' : 'スタッフ'} · {profile.full_name}
            </div>
          )}
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <NavLinks items={navItems} pathname={pathname} />
        </div>

        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-base text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
          >
            <span>ログアウト</span>
          </button>
        </div>
      </nav>

      {/* スマホ / タブレット縦向き: 上部バー */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-blue-900 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-bold text-lg">AJC 業務管理</div>
            {profile?.store_name && (
              <div className="text-xs text-blue-300">{profile.store_name}</div>
            )}
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-3 text-white rounded-lg hover:bg-blue-800"
          >
            <div className="w-7 h-0.5 bg-white mb-2"></div>
            <div className="w-7 h-0.5 bg-white mb-2"></div>
            <div className="w-7 h-0.5 bg-white"></div>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-blue-700 bg-blue-900 pb-2">
            <NavLinks items={navItems} pathname={pathname} onClose={() => setMenuOpen(false)} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-4 text-lg text-blue-200"
            >
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </nav>
    </>
  )
}
