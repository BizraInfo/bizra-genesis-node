import React from 'react'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import AdvancedMetrics from '../components/AdvancedMetrics'

const Monitoring: React.FC = () => {
  return (
    <div className="monitoring-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1><BarChart3 /> System Monitoring</h1>
        <p>Real-time performance metrics and system health</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AdvancedMetrics />
      </motion.div>
    </div>
  )
}

export default Monitoring
