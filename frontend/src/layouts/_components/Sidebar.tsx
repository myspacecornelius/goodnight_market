/**
 * Elegant Sidebar Navigation
 * Refined, minimal sidebar with smooth interactions
 */

import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Map, Zap, User, Droplets, Route, Rss, Calendar, ClipboardList, ShoppingBag } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import { cn } from '@/lib/cn'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/laces', label: 'LACES', icon: Zap },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/dropzones', label: 'DropZones', icon: Droplets },
  { to: '/thriftroutes', label: 'ThriftRoutes', icon: Route },
  { to: '/feed', label: 'Feed', icon: Rss },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/drops', label: 'Drops', icon: Calendar },
  { to: '/quests', label: 'Quests', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: User },
]

export const Sidebar = () => {
  const { isSidebarOpen } = useUiStore()

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'relative hidden h-screen bg-surface border-r border-elegant-200 transition-all duration-300 md:flex md:flex-col',
        isSidebarOpen ? 'w-64' : 'w-20',
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-center h-16 border-b border-elegant-200 px-4">
        <h1 
          className={cn(
            'font-serif font-bold text-indigo-600 transition-all duration-300',
            isSidebarOpen ? 'text-2xl' : 'text-xl'
          )}
        >
          {isSidebarOpen ? 'Dharma' : 'D'}
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          {links.map((link, index) => (
            <motion.li
              key={link.to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    'hover:bg-elegant-100 hover:text-indigo-600',
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                      : 'text-elegant-700',
                    !isSidebarOpen && 'justify-center px-2',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon 
                      className={cn(
                        'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                        isActive && 'scale-110'
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span 
                      className={cn(
                        'transition-opacity duration-200',
                        !isSidebarOpen && 'hidden'
                      )}
                    >
                      {link.label}
                    </span>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 30 
                        }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Footer / User Section (Optional) */}
      <div className="border-t border-elegant-200 p-4">
        <div className={cn(
          'flex items-center gap-3 transition-all duration-300',
          !isSidebarOpen && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            D
          </div>
          {isSidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-elegant-900 truncate">David</p>
              <p className="text-xs text-elegant-500 truncate">david@dharma.com</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
