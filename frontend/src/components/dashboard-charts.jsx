"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueChart, IncomeLineChart, IncomeAreaChart, ShopsPieChart, SimpleBarChart, RadarChartSimple, RadialBarChartSimple, ComposedChartSimple, StackedBarChart, MultiLineChart, DonutChart } from "@/components/charts"
import { dashboardService } from "@/services/dashboard/dashboardService"

const formatCurrency = (v) => v ? `$${Number(v).toLocaleString('es-CO')}` : '$0'

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    emerald: "text-amber-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
    cyan: "text-cyan-400"
  }
  
  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color] || colorClasses.emerald}`}>{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SuperAdminDashboard({ data = {} }) {
  const [chartData, setChartData] = useState({
    dailyIncome: [],
    incomeByShop: [],
    appointmentsTrend: [],
    clientsByShop: [],
    servicesByShop: [],
    licenseStatus: [],
    revenueTrend: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const r = await dashboardService.getSuperAdmin('month')
      setChartData({
        dailyIncome: r.dailyIncome || [],
        incomeByShop: r.incomeByShop || [],
        appointmentsTrend: r.appointmentsTrend || [],
        clientsByShop: r.clientsByShop || [],
        servicesByShop: r.servicesByShop || [],
        licenseStatus: r.licenseStatus || [],
        revenueTrend: r.revenueTrend || []
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-50">Panel de Superadministrador</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-slate-950 border-slate-800 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = data.stats || {}
  
  const pieData = (chartData.incomeByShop || []).map(s => ({ shop: s.shop, income: Number(s.income || 0) }))
  
  const radarData = [
    { subject: 'Barberías', value: stats.totalShops || 0 },
    { subject: 'Barberos', value: stats.totalBarbers || 0 },
    { subject: 'Clientes', value: stats.totalClients || 0 },
    { subject: 'Citas', value: stats.monthAppointments || 0 },
    { subject: 'Ingresos', value: Math.min(10, (stats.monthRevenue || 0) / 1000000) },
    { subject: 'Ganancias', value: Math.min(10, (stats.profit || 0) / 500000) }
  ]

  const radialData = [
    { name: 'Activas', value: stats.activeShops || 0 },
    { name: 'Inactivas', value: stats.expiredShops || 0 },
    { name: 'Pendientes', value: 0 }
  ]

  const composedData = (chartData.clientsByShop || []).map(s => ({
    name: (s.shop || '').substring(0, 10),
    barbers: s.barbers || 0,
    clients: s.clients || 0
  }))

  const stackedData = [
    { name: 'Suscripciones', suscripciones: stats.subscriptionUsers || 0, occasionales: (stats.totalClients || 0) - (stats.subscriptionUsers || 0) }
  ]

  const barChartData = (chartData.incomeByShop || []).map(s => ({
    name: (s.shop || '').substring(0, 12),
    value: Number(s.income || 0)
  }))

  const multiLineData = [
    { name: 'Ene', ingresos: 21000000, citas: 120 },
    { name: 'Feb', ingresos: 19500000, citas: 110 },
    { name: 'Mar', ingresos: 24000000, citas: 140 },
    { name: 'Abr', ingresos: 22800000, citas: 130 },
    { name: 'May', ingresos: 26100000, citas: 150 },
    { name: 'Jun', ingresos: 24500000, citas: 145 }
  ]

  const donutData = [
    { name: 'Corte cabello', value: 45 },
    { name: 'Afeitado', value: 25 },
    { name: 'Barba', value: 20 },
    { name: 'Tratamiento', value: 10 }
  ]
  const moduleValueProps = [
    ['Plataforma', 'Control SaaS, licencias y operación global.'],
    ['Negocios', 'Onboarding rápido para múltiples verticales.'],
    ['Reservas', 'Agenda clara y menos ausencias.'],
    ['Finanzas', 'Pagos, wallet, crédito y reparto.'],
    ['Marketing', 'Campañas, promociones y reactivación.'],
    ['Fidelidad', 'Recompra con recompensas.'],
    ['On-demand', 'Servicios inmediatos por cercanía.'],
    ['Fila digital', 'Turnos visibles y mejor rotación.'],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Panel de Superadministrador</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Barberías" value={stats.totalShops || 0} subtitle={`${stats.activeShops || 0} activas`} icon="🏪" color="emerald" />
        <StatCard title="Ingresos Mes" value={formatCurrency(stats.monthRevenue)} subtitle={`Ganancia: ${formatCurrency(stats.profit)}`} icon="💰" color="emerald" />
        <StatCard title="Barberos" value={stats.totalBarbers || 0} icon="✂️" color="blue" />
        <StatCard title="Citas Mes" value={stats.monthAppointments || 0} subtitle={`${stats.weekAppointments || 0} esta semana`} icon="📅" color="amber" />
        <StatCard title="Clientes" value={stats.totalClients || 0} subtitle={`${stats.newClients || 0} nuevos`} icon="👥" color="violet" />
        <StatCard title="Suscripciones" value={stats.subscriptionUsers || 0} subtitle={`${((stats.subscriptionUsers || 0) / (stats.totalClients || 1) * 100).toFixed(0)}% del total`} icon="⭐" color="rose" />
        <StatCard title="Gasto Mes" value={formatCurrency(stats.expenses)} icon="📊" color="rose" />
        <StatCard title="APP Citas" value={stats.appAppointments || 0} subtitle="Por app" icon="📱" color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {moduleValueProps.map(([module, value]) => (
          <Card key={module} className="bg-slate-950 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-sm font-bold text-slate-50">{module}</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="ingresos" className="space-y-4">
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="ingresos" className="data-[state=active]:bg-slate-800">Ingresos</TabsTrigger>
          <TabsTrigger value="barberias" className="data-[state=active]:bg-slate-800">Barberías</TabsTrigger>
          <TabsTrigger value="operacion" className="data-[state=active]:bg-slate-800">Operación</TabsTrigger>
          <TabsTrigger value="metricas" className="data-[state=active]:bg-slate-800">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Ingresos Diarios (Área)</CardTitle>
                <CardDescription className="text-slate-400">Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeAreaChart data={chartData.dailyIncome} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Distribución Ingresos (Pie)</CardTitle>
                <CardDescription className="text-slate-400">Por barbería</CardDescription>
              </CardHeader>
              <CardContent>
                <ShopsPieChart data={pieData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Tendencia Ingresos (Línea)</CardTitle>
                <CardDescription className="text-slate-400">Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <MultiLineChart data={multiLineData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Ingresos por Barbería (Barras)</CardTitle>
                <CardDescription className="text-slate-400">Comparativa</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={barChartData} dataKey="value" nameKey="name" color="#10b981" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="barberias" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Estado Licencias (Donut)</CardTitle>
                <CardDescription className="text-slate-400">Activas vs vencidas</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart data={radialData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Clientes y Barberos (Composed)</CardTitle>
                <CardDescription className="text-slate-400">Por barbería</CardDescription>
              </CardHeader>
              <CardContent>
                <ComposedChartSimple data={composedData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Radar de Métricas</CardTitle>
                <CardDescription className="text-slate-400">Resumen general</CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChartSimple data={radarData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Barberías Activas (Radial)</CardTitle>
                <CardDescription className="text-slate-400">Estado actual</CardDescription>
              </CardHeader>
              <CardContent>
                <RadialBarChartSimple data={radialData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operacion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Servicios Populares (Barras)</CardTitle>
                <CardDescription className="text-slate-400">Por tipo de servicio</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart 
                  data={donutData.map(d => ({ name: d.name, value: d.value * 100000 }))}
                  dataKey="value" 
                  nameKey="name" 
                  color="#3b82f6" 
                />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Ingresos vs Citas (Líneas)</CardTitle>
                <CardDescription className="text-slate-400">Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <MultiLineChart data={multiLineData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Distribución Clientes (Stacked)</CardTitle>
                <CardDescription className="text-slate-400">Suscripciones vs ocasionales</CardDescription>
              </CardHeader>
              <CardContent>
                <StackedBarChart data={stackedData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Tendencia Citas (Área)</CardTitle>
                <CardDescription className="text-slate-400">Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={chartData.dailyIncome} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metricas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Radar General</CardTitle>
                <CardDescription className="text-slate-400">KPIs principales</CardDescription>
              </CardHeader>
              <CardContent>
                <RadarChartSimple data={radarData} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Resumen (Línea)</CardTitle>
                <CardDescription className="text-slate-400">Meses recientes</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeLineChart data={chartData.dailyIncome} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Distribución Ingresos</CardTitle>
                <CardDescription className="text-slate-400">Por barbería</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart data={pieData.slice(0, 5)} />
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-50">Comparativa Barberías</CardTitle>
                <CardDescription className="text-slate-400">Clientes y barberos</CardDescription>
              </CardHeader>
              <CardContent>
                <ComposedChartSimple data={composedData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
