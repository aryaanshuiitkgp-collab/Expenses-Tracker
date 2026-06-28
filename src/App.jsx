import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight,
  Trash2, Bell, UtensilsCrossed, ShoppingBasket, Bus, Zap, Home, ShoppingBag,
  HeartPulse, Clapperboard, GraduationCap, Sparkles, PiggyBank, Gift,
  Repeat, CreditCard, MoreHorizontal, ChevronDown, Download, Upload
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const CATEGORIES = [
  { name: "Food & Dining", icon: UtensilsCrossed, color: "#0f6e56" },
  { name: "Groceries", icon: ShoppingBasket, color: "#1d9e75" },
  { name: "Travel & Transport", icon: Bus, color: "#0c447c" },
  { name: "Bills & Utilities", icon: Zap, color: "#854f0b" },
  { name: "Rent & Housing", icon: Home, color: "#3c3489" },
  { name: "Shopping", icon: ShoppingBag, color: "#993556" },
  { name: "Health & Medical", icon: HeartPulse, color: "#a32d2d" },
  { name: "Entertainment", icon: Clapperboard, color: "#993c1d" },
  { name: "Education", icon: GraduationCap, color: "#185fa5" },
  { name: "Personal Care", icon: Sparkles, color: "#72243e" },
  { name: "Investments & Savings", icon: PiggyBank, color: "#27500a" },
  { name: "Gifts & Donations", icon: Gift, color: "#d4537e" },
  { name: "Subscriptions", icon: Repeat, color: "#3b6d11" },
  { name: "Loans & EMI", icon: CreditCard, color: "#712b13" },
  { name: "Other", icon: MoreHorizontal, color: "#5f5e5a" },
];

const STORAGE_KEY = "expenses";

function getCategory(name) {
  return CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatCurrency(n) {
  return "Rs " + Math.round(n).toLocaleString("en-IN");
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReminder, setShowReminder] = useState(true);

  // view: "months" | "days" | "transactions"
  const [view, setView] = useState("months");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Load saved expenses from the browser's local storage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setExpenses(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load expenses", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save expenses to local storage whenever they change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error("Failed to save expenses", e);
    }
  }, [expenses, loaded]);

  const monthSummaries = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const k = monthKey(e.date);
      if (!map[k]) map[k] = { key: k, total: 0, count: 0 };
      map[k].total += e.amount;
      map[k].count += 1;
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses]);

  const currentMonthData = monthSummaries.find((m) => m.key === selectedMonth);
  const monthIdx = monthSummaries.findIndex((m) => m.key === selectedMonth);
  const prevMonthData = monthSummaries[monthIdx + 1];
  const pctChange = prevMonthData && prevMonthData.total > 0 && currentMonthData
    ? Math.round(((currentMonthData.total - prevMonthData.total) / prevMonthData.total) * 100)
    : null;

  const daysInSelectedMonth = useMemo(() => {
    if (!selectedMonth) return [];
    const map = {};
    expenses.filter((e) => monthKey(e.date) === selectedMonth).forEach((e) => {
      if (!map[e.date]) map[e.date] = { date: e.date, total: 0, count: 0 };
      map[e.date].total += e.amount;
      map[e.date].count += 1;
    });
    return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    if (!selectedMonth) return [];
    const map = {};
    expenses.filter((e) => monthKey(e.date) === selectedMonth).forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, ...getCategory(name) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, selectedMonth]);

  const dayTransactions = useMemo(() => {
    if (!selectedDay) return [];
    return expenses.filter((e) => e.date === selectedDay).sort((a, b) => b.id - a.id);
  }, [expenses, selectedDay]);

  function openMonth(key) {
    setSelectedMonth(key);
    setView("days");
  }
  function openDay(dateStr) {
    setSelectedDay(dateStr);
    setView("transactions");
  }
  function goBack() {
    if (view === "transactions") { setView("days"); setSelectedDay(null); }
    else if (view === "days") { setView("months"); setSelectedMonth(null); }
  }

  function addExpense() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !date) return;
    const newExpense = {
      id: Date.now(),
      amount: amt,
      category,
      merchant: merchant.trim() || "Unspecified",
      note: note.trim(),
      date,
    };
    setExpenses((prev) => [...prev, newExpense]);
    setAmount(""); setMerchant(""); setNote("");
    setCategory(CATEGORIES[0].name);
    setDate(todayStr());
    setShowForm(false);
  }

  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function exportData() {
    const headers = ["Date", "Category", "Merchant", "Note", "Amount"];
    const rows = expenses
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((e) => [
        e.date,
        e.category,
        `"${(e.merchant || "").replace(/"/g, '""')}"`,
        `"${(e.note || "").replace(/"/g, '""')}"`,
        e.amount,
      ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-backup-${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.trim().split("\n");
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const matches = line.match(/(".*?"|[^,]+)(?=,|$)/g);
          if (!matches || matches.length < 5) continue;
          const clean = (s) => s.replace(/^"|"$/g, "").replace(/""/g, '"');
          const [date, category, merchant, note, amount] = matches.map(clean);
          const amt = parseFloat(amount);
          if (!date || !amt) continue;
          imported.push({
            id: Date.now() + i,
            date,
            category: category || "Other",
            merchant: merchant || "Unspecified",
            note: note || "",
            amount: amt,
          });
        }
        if (imported.length > 0) {
          setExpenses((prev) => [...prev, ...imported]);
        }
      } catch (err) {
        console.error("Import failed", err);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const bgStyle = {
    background: "linear-gradient(160deg, #eafaf3 0%, #f3fbf8 50%, #e8f7f0 100%)",
    minHeight: "100vh",
  };
  const glass = "backdrop-blur-md bg-white/55 border border-emerald-900/10";

  return (
    <div style={bgStyle} className="p-4 pb-28 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-400 opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-300 opacity-25 blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto relative">
        <header className="flex items-center justify-between mb-4 pt-2">
          <div>
            <p className="text-xs text-emerald-700 font-medium">
              {view === "months" && "All time"}
              {view === "days" && selectedMonth && monthLabel(selectedMonth)}
              {view === "transactions" && selectedDay && dayLabel(selectedDay)}
            </p>
            <h1 className="text-xl font-semibold text-emerald-950">
              {view === "months" ? "Expenses" : view === "days" ? "Daily summary" : "Transactions"}
            </h1>
          </div>
          <div className={`w-10 h-10 rounded-xl ${glass} flex items-center justify-center shadow-sm`}>
            <Calendar className="w-5 h-5 text-emerald-700" />
          </div>
        </header>

        {view === "months" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={exportData}
              className={`${glass} flex-1 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-800 hover:bg-white/70 transition shadow-sm`}
            >
              <Download className="w-3.5 h-3.5" /> Backup (CSV)
            </button>
            <label
              className={`${glass} flex-1 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-800 hover:bg-white/70 transition shadow-sm cursor-pointer`}
            >
              <Upload className="w-3.5 h-3.5" /> Restore
              <input type="file" accept=".csv" onChange={importData} className="hidden" />
            </label>
          </div>
        )}

        {view !== "months" && (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-emerald-700 font-medium mb-3 hover:text-emerald-900 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}

        {showReminder && view === "months" && (
          <div className={`${glass} rounded-2xl p-3 mb-4 flex items-start gap-2 shadow-sm`}>
            <Bell className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-900 flex-1">
              Don't forget to log today's PhonePe expenses right after you pay.
            </p>
            <button onClick={() => setShowReminder(false)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 1: MONTHS */}
        {view === "months" && (
          <div className="space-y-2">
            {monthSummaries.length === 0 ? (
              <div className={`${glass} rounded-2xl p-8 text-center shadow-sm`}>
                <p className="text-sm text-emerald-700">No expenses logged yet. Tap + to add your first one.</p>
              </div>
            ) : (
              monthSummaries.map((m) => (
                <button
                  key={m.key}
                  onClick={() => openMonth(m.key)}
                  className={`${glass} rounded-2xl p-4 w-full flex items-center justify-between shadow-sm hover:bg-white/70 transition`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-emerald-950">{monthLabel(m.key)}</p>
                      <p className="text-xs text-emerald-700">{m.count} transaction{m.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-950">{formatCurrency(m.total)}</span>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* LEVEL 2: DAYS IN MONTH */}
        {view === "days" && selectedMonth && (
          <>
            <div className={`${glass} rounded-2xl p-5 mb-4 shadow-sm`}>
              <p className="text-xs text-emerald-700 mb-1">Total this month</p>
              <p className="text-3xl font-semibold text-emerald-950">{formatCurrency(currentMonthData?.total || 0)}</p>
              {pctChange !== null && (
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 ${pctChange >= 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {pctChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(pctChange)}% vs last month
                  </span>
                </div>
              )}
            </div>

            {categoryBreakdown.length > 0 && (
              <div className={`${glass} rounded-2xl p-4 mb-4 shadow-sm`}>
                <h2 className="text-sm font-semibold text-emerald-900 mb-3">By category</h2>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={24} outerRadius={42} paddingAngle={2}>
                          {categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {categoryBreakdown.slice(0, 5).map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-emerald-800 truncate">{c.name}</span>
                        </div>
                        <span className="font-medium text-emerald-950 shrink-0 ml-2">{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-sm font-semibold text-emerald-900 mb-2 px-1">Days</h2>
            <div className="space-y-2">
              {daysInSelectedMonth.map((d) => {
                const dt = new Date(d.date);
                return (
                  <button
                    key={d.date}
                    onClick={() => openDay(d.date)}
                    className={`${glass} rounded-2xl p-3 w-full flex items-center justify-between shadow-sm hover:bg-white/70 transition`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs font-semibold text-emerald-800">
                        {dt.getDate()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-emerald-950">{dt.toLocaleDateString("en-IN", { weekday: "long" })}</p>
                        <p className="text-xs text-emerald-700">{d.count} item{d.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-950">{formatCurrency(d.total)}</span>
                      <ChevronRight className="w-4 h-4 text-emerald-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* LEVEL 3: TRANSACTIONS FOR A DAY */}
        {view === "transactions" && selectedDay && (
          <div className="space-y-2">
            {dayTransactions.map((e) => {
              const cat = getCategory(e.category);
              const Icon = cat.icon;
              return (
                <div key={e.id} className={`${glass} rounded-2xl p-3 flex items-center justify-between shadow-sm group`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "26" }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-950 truncate">{e.merchant}</p>
                      <p className="text-xs text-emerald-700 truncate">{e.note || cat.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-emerald-950">{formatCurrency(e.amount)}</span>
                    <button onClick={() => deleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 text-emerald-300 hover:text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 text-white rounded-full p-4 shadow-xl transition transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #1d9e75, #0f6e56)" }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-emerald-950/30 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-emerald-950">Add expense</h2>
              <button onClick={() => { setShowForm(false); setCategoryPickerOpen(false); }} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-emerald-700 mb-1.5 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">Rs</span>
                  <input
                    type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0" autoFocus
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-emerald-900/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-lg font-semibold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-700 mb-1.5 block">Category</label>
                <button
                  onClick={() => setCategoryPickerOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-emerald-900/15 bg-white"
                >
                  <span className="flex items-center gap-2 text-sm text-emerald-950">
                    {(() => { const C = getCategory(category).icon; return <C className="w-4 h-4" style={{ color: getCategory(category).color }} />; })()}
                    {category}
                  </span>
                  <ChevronDown className="w-4 h-4 text-emerald-500" />
                </button>
                {categoryPickerOpen && (
                  <div className="mt-2 grid grid-cols-1 gap-1 max-h-52 overflow-y-auto border border-emerald-900/10 rounded-xl p-1.5 bg-white">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.name}
                          onClick={() => { setCategory(c.name); setCategoryPickerOpen(false); }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition ${category === c.name ? "bg-emerald-50 text-emerald-900 font-medium" : "text-emerald-800 hover:bg-emerald-50/60"}`}
                        >
                          <Icon className="w-4 h-4" style={{ color: c.color }} />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-700 mb-1.5 block">Merchant</label>
                <input
                  type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Swiggy, Auto fare"
                  className="w-full px-3 py-3 rounded-xl border border-emerald-900/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-700 mb-1.5 block">Details / note (optional)</label>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Lunch with team, office commute"
                  rows={2}
                  className="w-full px-3 py-3 rounded-xl border border-emerald-900/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-700 mb-1.5 block">Date</label>
                <input
                  type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-emerald-900/15 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white"
                />
              </div>

              <button
                onClick={addExpense}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full text-white font-medium py-3 rounded-xl transition mt-2 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #1d9e75, #0f6e56)" }}
              >
                Save expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
