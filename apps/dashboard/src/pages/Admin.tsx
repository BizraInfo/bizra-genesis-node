import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Settings, Database } from 'lucide-react'

const Admin: React.FC = () => {
  return (
    <div className="admin-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1><Shield /> Administration</h1>
        <p>System administration and management</p>
      </motion.div>

      <motion.div
        className="admin-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="admin-card">
          <Users className="admin-icon" />
          <h3>User Management</h3>
          <p>Manage system users and permissions</p>
        </div>

        <div className="admin-card">
          <Settings className="admin-icon" />
          <h3>System Configuration</h3>
          <p>Configure system-wide settings</p>
        </div>

        <div className="admin-card">
          <Database className="admin-icon" />
          <h3>Data Management</h3>
          <p>Database and backup management</p>
        </div>
      </motion.div>
    </div>
  )
}

export default Admin
