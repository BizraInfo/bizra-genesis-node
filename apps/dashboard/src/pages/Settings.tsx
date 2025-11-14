// BIZRA Genesis Node - Settings Page

import React from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          <p className="text-gray-600">Manage your personal information</p>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          <p className="text-gray-600">Configure notification preferences</p>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          </div>
          <p className="text-gray-600">Manage security and privacy settings</p>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4">
            <Palette className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
          </div>
          <p className="text-gray-600">Customize theme and display options</p>
        </div>
      </div>
    </div>
  );
}
