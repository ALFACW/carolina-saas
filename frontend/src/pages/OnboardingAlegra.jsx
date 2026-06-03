import React from 'react'
import { useNavigate } from 'react-router-dom'
import { WizardAlegra } from '../components/Onboarding/WizardAlegra'
import { Zap } from 'lucide-react'

export default function OnboardingAlegra() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl"><Zap className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-bold text-gray-900">Carolina Facturación</h1>
        </div>
        <p className="text-gray-500 mt-2 text-sm">Configuración de facturación electrónica DIAN</p>
      </div>
      <WizardAlegra onComplete={() => navigate('/dashboard')} />
    </div>
  )
}
