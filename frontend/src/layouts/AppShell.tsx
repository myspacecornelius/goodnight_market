/**
 * Elegant AppShell
 * Main application layout with sidebar and topbar
 */

import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Topbar } from './_components/Topbar'
import { Sidebar } from './_components/Sidebar'

const AppShell = () => {
  return (
    <div className="flex h-screen bg-elegant-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-elegant-50 p-6 md:p-8"
        >
          {/* Content Container with Max Width */}
          <div className="container-elegant">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  )
}

export default AppShell
