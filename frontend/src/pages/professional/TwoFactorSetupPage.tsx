import React, { useState, useEffect } from 'react'
import { useAuth } from '@/App'
import { twoFactorService } from '@/services/auth/twoFactorService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Shield, Loader2, Copy, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function TwoFactorSetupPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null)
  const [setupData, setSetupData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    const res = await twoFactorService.status()
    setStatus(res)
  }

  const startSetup = async () => {
    try {
      setLoading(true)
      const res = await twoFactorService.setup()
      setSetupData(res)
    } catch {
      toast({ title: 'Error', description: 'No se pudo iniciar la configuración', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const enable = async () => {
    if (code.length !== 6) return
    try {
      setLoading(true)
      await twoFactorService.enable(code)
      toast({ title: 'Éxito', description: '2FA activado' })
      setSetupData(null)
      setCode('')
      loadStatus()
    } catch {
      toast({ title: 'Error', description: 'Código inválido', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    if (code.length !== 6) return
    try {
      setLoading(true)
      await twoFactorService.disable(code)
      toast({ title: 'Éxito', description: '2FA desactivado' })
      setCode('')
      loadStatus()
    } catch {
      toast({ title: 'Error', description: 'Código inválido', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copyRecovery = (rc: string) => {
    navigator.clipboard.writeText(rc)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="w-6 h-6" /> Autenticación de dos factores
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Estado
            <Badge variant={status?.enabled ? 'default' : 'secondary'}>
              {status?.enabled ? 'Activado' : 'Desactivado'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.enabled && !setupData && (
            <Button onClick={startSetup} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Configurar 2FA
            </Button>
          )}

          {setupData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escanea el QR con Google Authenticator o similar:
              </p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qr_code_url)}`}
                  alt="QR 2FA"
                  className="rounded-lg border"
                />
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Secret manual:</p>
                <p className="font-mono text-sm select-all">{setupData.secret}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Código de verificación</label>
                <Input value={code} onChange={e => setCode(e.target.value)} maxLength={6} placeholder="123456" />
              </div>
              <Button onClick={enable} disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Activar
              </Button>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Códigos de recuperación (guárdalos):</p>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.recovery_codes?.map((rc: string) => (
                    <button
                      key={rc}
                      onClick={() => copyRecovery(rc)}
                      className="text-xs font-mono bg-muted p-2 rounded flex items-center justify-between hover:bg-muted/80"
                    >
                      {rc} {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status?.enabled && !setupData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para desactivar 2FA, ingresa un código actual de tu app:
              </p>
              <Input value={code} onChange={e => setCode(e.target.value)} maxLength={6} placeholder="123456" />
              <Button variant="destructive" onClick={disable} disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Desactivar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
