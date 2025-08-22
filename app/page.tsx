"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { database } from "../firebase";
import { ref, set, onValue } from "firebase/database";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Trash2,
  Receipt,
} from "lucide-react"
import jsPDF from "jspdf"
import { ThemeToggle } from "@/components/theme-toggle"

interface DailySale {
  date: string
  amount: number
  netAmount: number
  honoraireAmount: number
}

interface MonthlySummary {
  month: string
  total: number
  netTotal: number
  honoraireTotal: number
  days: number
}

// Hook pour détecter iOS
function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent;
      setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream);
    }
  }, []);

  return isIOS;
}

export default function SalesTrackingSystem() {
  const isIOS = useIsIOS();
  const [currentYear] = useState(new Date().getFullYear())
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [dailyAmount, setDailyAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)

  // Initialize data
  useEffect(() => {
    const salesRef = ref(database, "ventes/");
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const salesArray: DailySale[] = Object.entries(data).map(([date, value]: any) => ({
        date,
        amount: value.amount,
        honoraireAmount: value.honoraireAmount || value.amount * 0.20, // 20%
        netAmount: value.netAmount || value.amount * 0.80, // 80%
      }));
      setDailySales(salesArray);
    });
  }, []);

  const addDailySale = async () => {
    if (!dailyAmount || !selectedDate) {
      setFirebaseError("Veuillez entrer un montant valide");
      return;
    }

    setIsLoading(true);
    setFirebaseError(null);

    const amount = parseFloat(dailyAmount);
    if (isNaN(amount)) {
      setFirebaseError("Montant invalide");
      setIsLoading(false);
      return;
    }

    const honoraireAmount = amount * 0.20;  // 20% du total
    const netAmount = amount * 0.80;        // 80% du total

    try {
      await set(ref(database, "ventes/" + selectedDate), {
        amount,
        honoraireAmount,
        netAmount,
      });
      
      setDailyAmount("");
    } catch (error) {
      console.error("Erreur Firebase:", error);
      setFirebaseError("Erreur lors de l'enregistrement. Vérifiez la connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const getDailySaleForDate = (date: string) => {
    return dailySales.find((sale) => sale.date === date)
  }

  const getMonthlySummaries = (): MonthlySummary[] => {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ]

    return months.map((month, index) => {
      let total = 0
      let netTotal = 0
      let honoraireTotal = 0
      let days = 0

      const monthStart = new Date(currentYear, index, 1)
      const monthEnd = new Date(currentYear, index + 1, 0)

      dailySales.forEach((sale) => {
        const saleDate = new Date(sale.date)
        if (saleDate >= monthStart && saleDate <= monthEnd) {
          total += sale.amount
          netTotal += sale.netAmount
          honoraireTotal += sale.honoraireAmount
          days++
        }
      })

      return {
        month,
        total,
        netTotal,
        honoraireTotal,
        days,
      }
    })
  }

  const getChartData = () => {
    const weeklyData: { [key: string]: { gross: number; net: number } } = {}

    dailySales.forEach((sale) => {
      const date = new Date(sale.date)
      const weekNumber = Math.ceil(date.getDate() / 7)
      const monthWeek = `${date.toLocaleDateString("fr-FR", { month: "short" })} S${weekNumber}`

      if (!weeklyData[monthWeek]) {
        weeklyData[monthWeek] = { gross: 0, net: 0 }
      }

      weeklyData[monthWeek].gross += sale.amount
      weeklyData[monthWeek].net += sale.netAmount
    })

    return Object.entries(weeklyData)
      .slice(0, 12)
      .map(([week, data]) => ({
        week,
        "Ventes Brutes": data.gross,
        "Ventes Nettes": data.net,
      }))
  }

  const getTotalStats = () => {
    const total = dailySales.reduce((sum, day) => sum + (day?.amount || 0), 0)
    const netTotal = dailySales.reduce((sum, day) => sum + (day?.netAmount || 0), 0)
    const honoraireTotal = dailySales.reduce((sum, day) => sum + (day?.honoraireAmount || 0), 0)
    const daysWithSales = dailySales.length

    return { total, netTotal, honoraireTotal, daysWithSales }
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const stats = getTotalStats()
    const monthlySummaries = getMonthlySummaries()

    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("FAGAFIJO", 20, 20)

    doc.setFontSize(18)
    doc.setFont("helvetica", "normal")
    doc.text("Rapport Annuel des Ventes Quotidiennes", 20, 35)

    doc.setFontSize(12)
    doc.text(`Année: ${currentYear}`, 20, 50)
    doc.text(`Date de génération: ${new Date().toLocaleDateString("fr-FR")}`, 20, 60)

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Résumé Annuel", 20, 80)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Total des ventes brutes: ${(stats.total || 0).toFixed(2)} $`, 20, 95)
    doc.text(`Total des honoraires: ${(stats.honoraireTotal || 0).toFixed(2)} $`, 20, 105)
    doc.text(`Total des ventes nettes: ${(stats.netTotal || 0).toFixed(2)} $`, 20, 115)
    doc.text(`Nombre de jours avec ventes: ${stats.daysWithSales || 0}`, 20, 125)

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Détail Mensuel", 20, 145)

    let yPos = 160
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Mois", 20, yPos)
    doc.text("Ventes Brutes", 60, yPos)
    doc.text("Honoraires", 110, yPos)
    doc.text("Ventes Nettes", 150, yPos)
    doc.text("Jours", 190, yPos)

    doc.setFont("helvetica", "normal")
    monthlySummaries.forEach((month, index) => {
      yPos += 10
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.text(month.month, 20, yPos)
      doc.text(`${(month.total || 0).toFixed(2)} $`, 60, yPos)
      doc.text(`${(month.honoraireTotal || 0).toFixed(2)} $`, 110, yPos)
      doc.text(`${(month.netTotal || 0).toFixed(2)} $`, 150, yPos)
      doc.text((month.days || 0).toString(), 190, yPos)
    })

    if (dailySales.length > 0) {
      doc.addPage()
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Détail des Ventes Quotidiennes", 20, 20)

      yPos = 35
      doc.setFontSize(9)
      doc.text("Date", 20, yPos)
      doc.text("Vente Brute", 60, yPos)
      doc.text("Honoraire", 110, yPos)
      doc.text("Vente Nette", 150, yPos)

      doc.setFont("helvetica", "normal")
      dailySales.forEach((sale) => {
        yPos += 8
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(new Date(sale.date).toLocaleDateString("fr-FR"), 20, yPos)
        doc.text(`${sale.amount.toFixed(2)} $`, 60, yPos)
        doc.text(`${sale.honoraireAmount.toFixed(2)} $`, 110, yPos)
        doc.text(`${sale.netAmount.toFixed(2)} $`, 150, yPos)
      })
    }

    doc.save(`rapport-ventes-quotidiennes-${currentYear}.pdf`)
  }

  const deleteDailySale = (dateToDelete: string) => {
    set(ref(database, "ventes/" + dateToDelete), null)
      .then(() => {
        console.log("Donnée supprimée avec succès");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression:", error);
        setFirebaseError("Erreur lors de la suppression");
      });
  }

  const stats = getTotalStats()
  const monthlySummaries = getMonthlySummaries()
  const currentDailySale = getDailySaleForDate(selectedDate)
  const chartData = getChartData()

  const quarterlyData = [
    { name: "T1", value: monthlySummaries.slice(0, 3).reduce((sum, m) => sum + m.netTotal, 0) },
    { name: "T2", value: monthlySummaries.slice(3, 6).reduce((sum, m) => sum + m.netTotal, 0) },
    { name: "T3", value: monthlySummaries.slice(6, 9).reduce((sum, m) => sum + m.netTotal, 0) },
    { name: "T4", value: monthlySummaries.slice(9, 12).reduce((sum, m) => sum + m.netTotal, 0) },
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className={`min-h-screen bg-background p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 ${isIOS ? 'ios-fix' : ''}`}>
      {/* Header */}
      <div className="animate-bounce-in">
        <Card className={`bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-xl ${isIOS ? 'card-fix' : ''}`}>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 rounded-lg px-3 py-1 animate-pulse-glow">
                    <span className="text-lg sm:text-xl font-bold text-white">FAGAFIJO</span>
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 animate-spin-slow" />
                  <span className="break-words">Suivi Annuel des Ventes Quotidiennes {currentYear}</span>
                </CardTitle>
                <CardDescription className="text-primary-foreground/90 text-sm sm:text-base mt-2">
                  Système de gestion et suivi des ventes quotidiennes avec calculs automatiques
                </CardDescription>
              </div>
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-stagger-in ${isIOS ? 'ios-grid-fix' : ''}`}>
        <Card className="hover:shadow-xl transition-all duration-500 hover:scale-105 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Ventes Brutes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0 animate-bounce-subtle" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-chart-1 break-all animate-number-count">
              {(stats.total || 0).toFixed(2)} $
            </div>
            <p className="text-xs text-foreground/70">Saisies quotidiennes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-500 hover:scale-105 animate-slide-up animation-delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Honoraires</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0 animate-bounce-subtle" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-chart-3 break-all animate-number-count">
              {(stats.honoraireTotal || 0).toFixed(2)} $
            </div>
            <p className="text-xs text-foreground/70">20% des ventes brutes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-500 hover:scale-105 animate-slide-up animation-delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Ventes Nettes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0 animate-bounce-subtle" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-chart-2 break-all animate-number-count">
              {(stats.netTotal || 0).toFixed(2)} $
            </div>
            <p className="text-xs text-foreground/70">80% des ventes brutes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-500 hover:scale-105 animate-slide-up animation-delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Jours avec Ventes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 animate-bounce-subtle" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-chart-4 animate-number-count">{stats.daysWithSales}</div>
            <p className="text-xs text-foreground/70">Jours enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="quotidien" className="animate-fade-in-up">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto bg-muted/50">
          <TabsTrigger value="quotidien" className="text-xs sm:text-sm px-2 py-2 transition-all duration-300">
            Saisie Quotidienne
          </TabsTrigger>
          <TabsTrigger value="hebdomadaire" className="text-xs sm:text-sm px-2 py-2 transition-all duration-300">
            Vue Hebdomadaire
          </TabsTrigger>
          <TabsTrigger value="mensuel" className="text-xs sm:text-sm px-2 py-2 transition-all duration-300">
            Résumé Mensuel
          </TabsTrigger>
          <TabsTrigger value="statistiques" className="text-xs sm:text-sm px-2 py-2 transition-all duration-300">
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotidien" className="space-y-4 mt-4">
          <Card className="animate-slide-in-left">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-5 w-5 flex-shrink-0 animate-pulse-subtle" />
                Saisie des Ventes Quotidiennes
              </CardTitle>
              <CardDescription className="text-sm text-foreground/80">
                Ajoutez vos ventes jour par jour. Les ventes nettes (80%) et honoraires (20%) sont calculées automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {firebaseError && (
                <div className="p-3 bg-destructive/15 text-destructive-foreground rounded-md border border-destructive/20">
                  {firebaseError}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-foreground">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full transition-all duration-300 focus:scale-105"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyAmount" className="text-sm font-medium text-foreground">
                    Montant du Jour ($)
                  </Label>
                  <Input
                    id="dailyAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={dailyAmount}
                    onChange={(e) => setDailyAmount(e.target.value)}
                    className="w-full transition-all duration-300 focus:scale-105"
                  />
                </div>
              </div>

              <Button
                onClick={addDailySale}
                disabled={!dailyAmount || isLoading}
                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 animate-pulse-on-hover"
              >
                {isLoading ? (
                  <div className="animate-spin-pulse">Ajout en cours...</div>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2 animate-bounce-subtle" />
                    Enregistrer le Jour
                  </>
                )}
              </Button>

              {dailyAmount && (
                <div className="p-3 sm:p-4 bg-muted/70 rounded-lg animate-fade-in-scale border border-primary/20">
                  <p className="text-sm break-words text-foreground">
                    <strong>Aperçu:</strong> Vente brute: {(Number.parseFloat(dailyAmount || "0") || 0).toFixed(2)} $ →
                    Honoraire: {((Number.parseFloat(dailyAmount || "0") || 0) * 0.20).toFixed(2)} $ → Vente nette:{" "}
                    {((Number.parseFloat(dailyAmount || "0") || 0) * 0.80).toFixed(2)} $
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {currentDailySale && (
            <Card className="animate-fade-in">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">
                  Ventes du {new Date(selectedDate).toLocaleDateString("fr-FR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-muted rounded-lg gap-3">
                    <div>
                      <p className="font-medium">{new Date(selectedDate).toLocaleDateString("fr-FR")}</p>
                      <p className="text-sm text-muted-foreground">Total enregistré</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                      <Badge variant="outline" className="text-sm px-3 py-1 justify-center">
                        {(currentDailySale.amount || 0).toFixed(2)} $ brut
                      </Badge>
                      <Badge variant="secondary" className="text-sm px-3 py-1 justify-center">
                        {(currentDailySale.honoraireAmount || 0).toFixed(2)} $ honoraire
                      </Badge>
                      <Badge variant="default" className="text-sm px-3 py-1 justify-center">
                        {(currentDailySale.netAmount || 0).toFixed(2)} $ net
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {dailySales.length > 0 && (
            <Card className="animate-slide-in-right">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Ventes Quotidiennes Récentes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dailySales
                    .slice(-10)
                    .reverse()
                    .map((sale, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-muted/30 rounded-lg gap-3 hover:bg-muted/50 transition-all duration-300 animate-fade-in-item"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex-shrink-0">
                          <p className="font-medium text-foreground">
                            {new Date(sale.date).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                          <Badge variant="outline" className="text-xs bg-background/50">
                            {sale.amount.toFixed(2)} $ brut
                          </Badge>
                          <Badge variant="secondary" className="text-xs bg-background/50">
                            {sale.honoraireAmount.toFixed(2)} $ honoraire
                          </Badge>
                          <Badge variant="default" className="text-xs bg-background/50">
                            {sale.netAmount.toFixed(2)} $ net
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteDailySale(sale.date)}
                            className="h-8 w-8 p-0 flex-shrink-0 hover:scale-110 transition-all duration-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hebdomadaire" className="space-y-4 mt-4">
          <Card className="animate-slide-in-up">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-foreground">Vue Hebdomadaire</CardTitle>
              <CardDescription className="text-foreground/80">
                Aperçu des ventes quotidiennes regroupées par semaines
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {chartData.length > 0 ? (
                <div className="w-full" style={{ height: isIOS ? '300px' : '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                      <XAxis dataKey="week" fontSize={12} tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                      <YAxis fontSize={12} tick={{ fill: "hsl(var(--foreground))" }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toFixed(2)} $`, ""]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Ventes Brutes" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="Ventes Nettes" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible pour afficher le graphique hebdomadaire
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensuel" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Résumé Mensuel</CardTitle>
              <CardDescription>Totaux par mois avec nombre de jours actifs</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {monthlySummaries.map((month, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-base sm:text-lg">{month.month}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-4 pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-muted-foreground">Ventes Brutes:</span>
                        <span className="font-semibold text-chart-1 text-xs sm:text-sm break-all">
                          {(month.total || 0).toFixed(2)} $
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-muted-foreground">Honoraires:</span>
                        <span className="font-semibold text-chart-3 text-xs sm:text-sm break-all">
                          {(month.honoraireTotal || 0).toFixed(2)} $
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-muted-foreground">Ventes Nettes:</span>
                        <span className="font-semibold text-chart-2 text-xs sm:text-sm break-all">
                          {(month.netTotal || 0).toFixed(2)} $
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-muted-foreground">Jours:</span>
                        <Badge variant="outline" className="text-xs">
                          {month.days}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistiques" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 flex-shrink-0" />
                  Évolution des Ventes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {chartData.length > 0 ? (
                  <div className="h-48 sm:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={12} tick={{ fontSize: 10 }} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} $`, ""]} />
                        <Line type="monotone" dataKey="Ventes Nettes" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="h-5 w-5 flex-shrink-0" />
                  Répartition Trimestrielle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {quarterlyData.some(q => q.value > 0) ? (
                  <div className="h-48 sm:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={quarterlyData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {quarterlyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} $`, ""]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="animate-slide-in-up">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 flex-shrink-0 animate-pulse-subtle" />
                Export et Rapports
              </CardTitle>
              <CardDescription>Générez et téléchargez vos rapports de ventes quotidiennes complets</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={exportToPDF}
                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 animate-pulse-on-hover"
              >
                <Download className="h-4 w-4 mr-2 animate-bounce-subtle" />
                Exporter en PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}