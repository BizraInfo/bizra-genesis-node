// BIZRA Genesis Node - Admin Page

import React from 'react';
import { Shield, Users, Database, Settings } from 'lucide-react';

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System administration and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-900">User Management</h2>
          </div>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-900">Database</h2>
          </div>
          <p className="text-gray-600">Database management and backups</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-900">System Settings</h2>
          </div>
          <p className="text-gray-600">Configure system-wide settings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-900">Security</h2>
          </div>
          <p className="text-gray-600">Security audit and access control</p>
        </div>
      </div>
    </div>
  );
}
