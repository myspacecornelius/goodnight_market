/**
 * Elegant Topbar
 * Floating topbar with refined search and user controls
 */

import { Menu, Search, Bell } from 'lucide-react'
import { motion } from 'framer-motion'

import WalletDrawer from '@/components/hyperlocal/WalletDrawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/ui'

export const Topbar = () => {
  const { toggleSidebar } = useUiStore()
  const { user, logout } = useAuth()

  const initials = (user?.display_name || user?.username || 'DN')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-16 items-center justify-between gap-4 border-b border-elegant-200 bg-surface/95 backdrop-blur-sm px-6 sticky top-0 z-50"
    >
      {/* Left Side - Menu & Search */}
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden hover:bg-elegant-100" 
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5 text-elegant-700" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>

        {/* Elegant Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-elegant-500" />
          <Input
            type="search"
            placeholder="Search Dharma..."
            className="w-full pl-10 pr-4 py-2 bg-elegant-50 border-elegant-200 rounded-lg text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Side - Actions & User */}
      <div className="flex items-center gap-3">
        {/* LACES Wallet */}
        <WalletDrawer />

        {/* Notifications */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-elegant-100 rounded-full"
          >
            <Bell className="h-5 w-5 text-elegant-700" />
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
            <span className="sr-only">Notifications</span>
          </Button>
        </motion.div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-full hover:bg-elegant-100 p-1 pr-3 transition-colors duration-200"
            >
              <Avatar className="h-8 w-8 border-2 border-elegant-200">
                <AvatarImage src={user?.avatar_url} alt={user?.username} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium text-elegant-900">
                {user?.display_name || user?.username || 'Member'}
              </span>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-semibold text-elegant-900">
                  {user?.display_name || user?.username || 'Member'}
                </span>
                <span className="text-xs text-elegant-500">
                  {user?.email || 'member@dharma.com'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <span className="text-sm">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <span className="text-sm">LACES Balance</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => logout()}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            >
              <span className="text-sm font-medium">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  )
}
