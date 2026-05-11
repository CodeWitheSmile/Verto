import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  X,
  Plus,
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Receipt,
  Search,
} from "lucide-react";

// ─── MASTER DATA ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "OS",
  "Temp",
  "Rec",
  "BD",
  "Accts",
  "HR",
  "Admin",
  "IT",
  "Legal",
  "Projects",
  "Others",
];

const PAY_HEADS = [
  "Asset Purchase",
  "Repair",
  "Software",
  "Daily Consumable",
  "Office Stationery",
  "Printing",
  "Courier",
  "Rental",
  "Water",
  "Electricity",
  "Parking",
  "Donation",
  "Internet",
  "Mobile Bill",
  "Transport",
  "Liaison",
  "Consultant Fee",
  "Petty Cash",
  "Others",
];

const COST_HEADS = ["ops", "temp", "recruitment", "projects", "others"];
const COST_HEAD_LABELS = {
  ops: "Ops",
  temp: "Temp",
  recruitment: "Rec",
  projects: "Projects",
  others: "Others",
};

const DEFAULT_FORM = {
  clientType: "Verto",
  clientName: "",
  isBillable: false,
  entity: "",
  department: "",
  payHead: "",
  paymentDescription: "",
  monthOfExpense: "",
  dueAmount: "",
  tdsAmount: "",
  transferAmount: "",
  dateOfPay: "",
  bankId: "",
  bankName: "",
  paymentMode: "bank",
  costHeadBreakup: { ops: 0, temp: 0, recruitment: 0, projects: 0, others: 0 },
  issuedTo: "",
  assetWarranty: "",
  remarks: "",
};

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
const FieldRow = ({ label, required, hint, error, children, highlight }) => (
  <div
    className={`grid grid-cols-[200px_1fr] gap-4 items-start py-3 border-b border-gray-100 last:border-0 ${
      highlight ? "bg-orange-50 -mx-4 px-4 rounded-lg" : ""
    }`}
  >
    <div className="pt-2">
      <span
        className={`text-sm font-medium ${
          highlight ? "text-orange-700" : "text-gray-700"
        }`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      {hint && (
        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{hint}</p>
      )}
    </div>
    <div>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  </div>
);

const Select = ({
  value,
  onChange,
  options,
  placeholder,
  error,
  className = "",
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition pr-8
        ${
          error
            ? "border-red-400 bg-red-50"
            : "border-gray-200 hover:border-gray-300"
        }
        ${className}`}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((opt) =>
        typeof opt === "string" ? (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ) : (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )
      )}
    </select>
    <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

const Input = ({
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  readOnly,
  className = "",
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition
      ${
        error
          ? "border-red-400 bg-red-50"
          : "border-gray-200 hover:border-gray-300"
      }
      ${readOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}
      ${className}`}
  />
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AddExpenseDetailsModal = ({
  isOpen,
  onClose,
  onSaved,
  editData,
  invoice,
}) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clients, setClients] = useState([]);
  const [entities, setEntities] = useState([]);
  const [banks, setBanks] = useState([]);

  // ── Invoice search state (for when no invoice prop) ──
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceResults, setInvoiceResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searching, setSearching] = useState(false);

  // ── Fetch master data ──
  useEffect(() => {
    if (!isOpen) return;
    const fetchMasters = async () => {
      const [c, e, b] = await Promise.all([
        supabase
          .from("clients_master")
          .select("id, client_name")
          .order("client_name"),
        supabase
          .from("entity_master")
          .select("id, entity_name")
          .order("entity_name"),
        supabase
          .from("bank_master")
          .select("id, bank_name, account_number")
          .order("bank_name"),
      ]);
      if (!c.error) setClients(c.data || []);
      if (!e.error) setEntities(e.data || []);
      if (!b.error) setBanks(b.data || []);
    };
    fetchMasters();
  }, [isOpen]);

  // ── Pre-fill edit data or passed invoice ──
  useEffect(() => {
    if (editData) {
      setForm({
        clientType: editData.client_name ? "Client" : "Verto",
        clientName: editData.client_name || "",
        isBillable: editData.is_billable || false,
        entity: editData.entity || "",
        department: editData.department || "",
        payHead: editData.pay_head || "",
        paymentDescription: editData.payment_description || "",
        monthOfExpense: editData.month_of_expense
          ? editData.month_of_expense.slice(0, 7)
          : "",
        dueAmount: editData.due_amount || "",
        tdsAmount: editData.tds_amount || "",
        transferAmount: editData.transfer_amount || "",
        dateOfPay: editData.payment_date || "",
        bankId: editData.bank_id || "",
        bankName: editData.bank_name || "",
        paymentMode: editData.bank_id ? "bank" : "cash",
        costHeadBreakup: {
          ops: editData.cost_ops || 0,
          temp: editData.cost_temp || 0,
          recruitment: editData.cost_recruitment || 0,
          projects: editData.cost_projects || 0,
          others: editData.cost_others || 0,
        },
        issuedTo: editData.issued_to || "",
        assetWarranty: editData.asset_warranty || "",
        remarks: editData.expense_remarks || "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }

    // ✅ Pre-select invoice if passed as prop
    if (invoice) {
      setSelectedInvoice(invoice);
    } else {
      setSelectedInvoice(null);
    }

    setErrors({});
    setSaved(false);
    setInvoiceSearch("");
    setInvoiceResults([]);
  }, [editData, isOpen, invoice]);

  // ── Auto-calculate transfer amount ──
  useEffect(() => {
    const due = parseFloat(form.dueAmount) || 0;
    const tds = parseFloat(form.tdsAmount) || 0;
    setForm((prev) => ({
      ...prev,
      transferAmount: Math.max(due - tds, 0).toString(),
    }));
  }, [form.dueAmount, form.tdsAmount]);

  // ── Auto-fill client name from selected invoice ──
  useEffect(() => {
    if (!selectedInvoice) return;
    const clientName =
      selectedInvoice.client_name ||
      selectedInvoice.clients_master?.client_name ||
      "";
    if (clientName) {
      setForm((prev) => ({ ...prev, clientName }));
    }
  }, [selectedInvoice]);

  // ── Invoice search debounce (only when no invoice prop and clientType=Client) ──
  useEffect(() => {
    if (invoice || form.clientType !== "Client" || !invoiceSearch) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        let query = supabase
          .from("invoices")
          .select(
            `
            id,
            invoice_number,
            receivable_amount,
            invoice_value,
            client_id,
            clients_master ( client_name )
          `
          )
          .ilike("invoice_number", `%${invoiceSearch}%`)
          .limit(8);

        // ── If client name is selected, filter by client ──
        if (form.clientName) {
          const { data: clientRow } = await supabase
            .from("clients_master")
            .select("id")
            .eq("client_name", form.clientName)
            .single();
          if (clientRow) {
            query = query.eq("client_id", clientRow.id);
          }
        }

        const { data } = await query;
        setInvoiceResults(data || []);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [invoiceSearch, form.clientName, form.clientType, invoice]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setCostHead = (head, value) => {
    const num = Math.min(Math.max(parseInt(value) || 0, 0), 100);
    setForm((prev) => ({
      ...prev,
      costHeadBreakup: { ...prev.costHeadBreakup, [head]: num },
    }));
    if (errors.costHead) setErrors((prev) => ({ ...prev, costHead: "" }));
  };

  const costTotal = Object.values(form.costHeadBreakup).reduce(
    (a, b) => a + b,
    0
  );
  const isAssetPurchase = form.payHead === "Asset Purchase";

  // ── Resolve invoice ID ──
  const resolvedInvoiceId =
    selectedInvoice?.dbId || selectedInvoice?.id || invoice?.dbId || null;

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (!form.entity) e.entity = "Entity is required";
    if (!form.department) e.department = "Department is required";
    if (!form.payHead) e.payHead = "Pay Head is required";
    if (!form.monthOfExpense) e.monthOfExpense = "Month of expense is required";
    if (!form.dueAmount || parseFloat(form.dueAmount) <= 0)
      e.dueAmount = "Due amount must be > 0";
    if (!form.dateOfPay) e.dateOfPay = "Date of pay is required";
    if (form.paymentMode === "bank" && !form.bankId) e.bankId = "Select a bank";
    if (form.isBillable && form.clientType === "Client" && !resolvedInvoiceId)
      e.invoiceId = "Select an invoice for billable expense";
    if (Math.round(costTotal) !== 100)
      e.costHead = `Total must be 100% (currently ${costTotal}%)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const selectedBank = banks.find((b) => b.id === form.bankId);
      const transferAmt = parseFloat(form.transferAmount) || 0;
      const dueAmt = parseFloat(form.dueAmount) || 0;

      // ── Payload for payments_made ──
      const payload = {
        amount: transferAmt,
        invoice_id: resolvedInvoiceId,
        payment_date: form.dateOfPay,
        petty_cash: form.payHead === "Petty Cash",
        client_name: form.clientType === "Client" ? form.clientName : null,
        is_billable: form.isBillable,
        entity: form.entity,
        department: form.department,
        pay_head: form.payHead,
        payment_description: form.paymentDescription,
        month_of_expense: form.monthOfExpense
          ? form.monthOfExpense + "-01"
          : null,
        due_amount: dueAmt,
        tds_amount: parseFloat(form.tdsAmount) || 0,
        transfer_amount: transferAmt,
        bank_id: form.paymentMode === "bank" ? form.bankId || null : null,
        bank_name:
          form.paymentMode === "cash"
            ? "Cash"
            : selectedBank?.bank_name || null,
        cost_ops: form.costHeadBreakup.ops,
        cost_temp: form.costHeadBreakup.temp,
        cost_recruitment: form.costHeadBreakup.recruitment,
        cost_projects: form.costHeadBreakup.projects,
        cost_others: form.costHeadBreakup.others,
        issued_to: isAssetPurchase ? form.issuedTo : null,
        asset_warranty: isAssetPurchase ? form.assetWarranty : null,
        expense_remarks: form.remarks,
      };

      let error;
      let savedPayment;

      if (editData?.id) {
        ({ data: savedPayment, error } = await supabase
          .from("payments_made")
          .update(payload)
          .eq("id", editData.id)
          .select()
          .single());
      } else {
        ({ data: savedPayment, error } = await supabase
          .from("payments_made")
          .insert([payload])
          .select()
          .single());
      }

      if (error) throw error;
      console.log("✅ SAVED PAYMENT:", savedPayment);
      // ✅ CREATE TDS LIABILITY
      if ((parseFloat(form.tdsAmount) || 0) > 0) {
        const { error: taxErr } = await supabase
          .from("statutory_liabilities")
          .insert([
            {
              source_type: "expense",

              source_id: savedPayment.id,

              statutory_type: "TDS",

              entity: form.entity,

              amount: parseFloat(form.tdsAmount),

              status: "pending",
            },
          ]);

        if (taxErr) {
          console.error("TDS liability error:", taxErr);
        }
      }

      // ── Bank Entry (debit) ──
      if (form.paymentMode === "bank" && form.bankId && transferAmt > 0) {
        const { error: bankErr } = await supabase.from("bank_entries").insert([
          {
            bank_id: form.bankId,
            entity: form.entity,
            amount: transferAmt,
            type: "debit",
            entry_type: "expense",
            remarks: form.paymentDescription || form.payHead || "Expense",
            reference_no: "EXP-" + Date.now(),
            invoice_id: resolvedInvoiceId,
          },
        ]);
        if (bankErr) console.error("Bank entry error:", bankErr);

        // ── Software Entry ──
        const { error: swErr } = await supabase
          .from("software_entries")
          .insert([
            {
              bank_id: form.bankId,
              entity: form.entity,
              amount: transferAmt, // ✅ NEGATIVE
              date: form.dateOfPay,
              remarks: form.paymentDescription || form.payHead || "Expense",
              invoice_id: resolvedInvoiceId,
            },
          ]);
        if (swErr) console.error("Software entry error:", swErr);
      }

      // ── ✅ BILLABLE EXPENSE → increase receivable_amount on invoice ──
      // Client owes more because we incurred an expense on their behalf
      if (
        form.isBillable &&
        form.clientType === "Client" &&
        resolvedInvoiceId &&
        transferAmt > 0
      ) {
        const { data: currentInvoice, error: invFetchErr } = await supabase
          .from("invoices")
          .select("receivable_amount, invoice_value")
          .eq("id", resolvedInvoiceId)
          .single();

        if (!invFetchErr && currentInvoice) {
          const newReceivable =
            Number(currentInvoice.receivable_amount || 0) + transferAmt;

          const { error: updateErr } = await supabase
            .from("invoices")
            .update({ receivable_amount: newReceivable })
            .eq("id", resolvedInvoiceId);

          if (updateErr) {
            console.error("Receivable update error:", updateErr);
          }
        }
      }

      // ── NON-BILLABLE: no invoice effect ──
      // Bank entry already done above; outstanding unchanged.

      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
        setForm(DEFAULT_FORM);
        setSaved(false);
        setSelectedInvoice(null);
        setInvoiceSearch("");
      }, 1000);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-t-2xl text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {editData ? "Edit" : "Add"} Non-Salary Expense / Payout
                </h3>
                <p className="text-orange-100 text-xs">
                  Fill all required fields marked with *
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
            {/* ══ SECTION 1: HEADER INFO ══ */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                  Header Information
                </h4>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 divide-y divide-gray-100">
                {/* Client / Verto */}
                <FieldRow
                  label="Client Name / Verto"
                  required
                  hint="Select Verto for internal expenses"
                >
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex gap-2">
                      {["Verto", "Client"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setField("clientType", opt);
                            setSelectedInvoice(invoice || null);
                            setInvoiceSearch("");
                            setInvoiceResults([]);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition border
                            ${
                              form.clientType === opt
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.clientType === "Client" && (
                      <Select
                        value={form.clientName}
                        onChange={(v) => {
                          setField("clientName", v);
                          setSelectedInvoice(invoice || null);
                          setInvoiceSearch("");
                          setInvoiceResults([]);
                        }}
                        options={clients.map((c) => ({
                          value: c.client_name,
                          label: c.client_name,
                        }))}
                        placeholder="Select client..."
                        error={errors.clientName}
                      />
                    )}
                  </div>
                </FieldRow>

                {/* Billable */}
                <FieldRow label="Billable / Non Billable">
                  <div className="flex gap-3 pt-1">
                    {[
                      { label: "Billable", value: true },
                      { label: "Non Billable", value: false },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setField("isBillable", opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition border
                          ${
                            form.isBillable === opt.value
                              ? opt.value
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-slate-500 text-white border-slate-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FieldRow>

                {/* ✅ Invoice Search / Link (shown when billable client expense) */}
                {form.isBillable && form.clientType === "Client" && (
                  <FieldRow
                    label="Link Invoice"
                    required
                    hint="Select the invoice this expense is billed against"
                    error={errors.invoiceId}
                    highlight
                  >
                    {/* If invoice passed from dashboard, show it as locked */}
                    {invoice ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="font-semibold text-gray-900 text-sm">
                          {invoice.invoice_number || invoice.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.client_name} — auto-linked from dashboard
                        </p>
                      </div>
                    ) : selectedInvoice ? (
                      // Selected via search
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {selectedInvoice.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedInvoice.clients_master?.client_name} •{" "}
                            Outstanding: ₹
                            {Number(
                              selectedInvoice.receivable_amount || 0
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedInvoice(null);
                            setInvoiceSearch("");
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 ml-3"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      // Search input
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by invoice number..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          className={`w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition
                            ${
                              errors.invoiceId
                                ? "border-red-400"
                                : "border-gray-200"
                            }`}
                        />
                        {searching && (
                          <p className="text-xs text-gray-400 mt-1 px-1">
                            Searching...
                          </p>
                        )}
                        {invoiceResults.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                            {invoiceResults.map((inv) => (
                              <button
                                key={inv.id}
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setInvoiceSearch(inv.invoice_number);
                                  setInvoiceResults([]);
                                  // Auto-fill client name
                                  if (inv.clients_master?.client_name) {
                                    setField(
                                      "clientName",
                                      inv.clients_master.client_name
                                    );
                                  }
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 transition text-sm border-b border-gray-100 last:border-0"
                              >
                                <p className="font-semibold text-gray-900">
                                  {inv.invoice_number}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {inv.clients_master?.client_name} •{" "}
                                  Outstanding: ₹
                                  {Number(
                                    inv.receivable_amount || 0
                                  ).toLocaleString("en-IN")}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                        {invoiceResults.length === 0 &&
                          invoiceSearch.length > 1 &&
                          !searching && (
                            <p className="text-xs text-gray-400 mt-1 px-1">
                              No invoices found for "{invoiceSearch}"
                            </p>
                          )}
                      </div>
                    )}
                  </FieldRow>
                )}

                {/* Entity */}
                <FieldRow label="Entity" required error={errors.entity}>
                  <Select
                    value={form.entity}
                    onChange={(v) => setField("entity", v)}
                    options={entities.map((e) => ({
                      value: e.entity_name,
                      label: e.entity_name,
                    }))}
                    placeholder="Select entity..."
                    error={errors.entity}
                  />
                </FieldRow>

                {/* Department */}
                <FieldRow
                  label="Department"
                  required
                  error={errors.department}
                  highlight
                >
                  <Select
                    value={form.department}
                    onChange={(v) => setField("department", v)}
                    options={DEPARTMENTS}
                    placeholder="Select department..."
                    error={errors.department}
                  />
                </FieldRow>

                {/* Pay Head */}
                <FieldRow
                  label="Pay Head – Non Salary"
                  required
                  error={errors.payHead}
                  highlight
                >
                  <Select
                    value={form.payHead}
                    onChange={(v) => setField("payHead", v)}
                    options={PAY_HEADS}
                    placeholder="Select pay head..."
                    error={errors.payHead}
                  />
                </FieldRow>
              </div>
            </section>

            {/* ══ SECTION 2: PAYMENT DETAILS ══ */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                  Payment Details
                </h4>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 divide-y divide-gray-100">
                <FieldRow label="Payment Description">
                  <textarea
                    value={form.paymentDescription}
                    onChange={(e) =>
                      setField("paymentDescription", e.target.value)
                    }
                    placeholder="Describe the expense..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none"
                  />
                </FieldRow>

                <FieldRow
                  label="Month of Expense"
                  required
                  error={errors.monthOfExpense}
                >
                  <Input
                    type="month"
                    value={form.monthOfExpense}
                    onChange={(v) => setField("monthOfExpense", v)}
                    error={errors.monthOfExpense}
                  />
                </FieldRow>

                {/* Due / TDS / Transfer */}
                <FieldRow
                  label="Due / TDS / Transfer"
                  required
                  error={errors.dueAmount}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Due Amount *",
                        key: "dueAmount",
                        readOnly: false,
                        style: errors.dueAmount
                          ? "border-red-400 bg-red-50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-900",
                      },
                      {
                        label: "TDS Amount",
                        key: "tdsAmount",
                        readOnly: false,
                        style: "border-gray-200 bg-white text-gray-900",
                      },
                      {
                        label: "Transfer Amount",
                        key: "transferAmount",
                        readOnly: true,
                        style:
                          "border-emerald-200 bg-emerald-50 text-gray-900 font-semibold",
                      },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-500 mb-1 block">
                          {f.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={form[f.key]}
                            onChange={(e) =>
                              !f.readOnly && setField(f.key, e.target.value)
                            }
                            readOnly={f.readOnly}
                            placeholder="0"
                            className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                              f.style
                            } ${f.readOnly ? "cursor-not-allowed" : ""}`}
                          />
                        </div>
                        {f.key === "transferAmount" && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            = Due − TDS (auto)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </FieldRow>

                <FieldRow label="Date of Pay" required error={errors.dateOfPay}>
                  <Input
                    type="date"
                    value={form.dateOfPay}
                    onChange={(v) => setField("dateOfPay", v)}
                    error={errors.dateOfPay}
                  />
                </FieldRow>

                {/* Bank / Cash */}
                <FieldRow label="Bank / Cash" required error={errors.bankId}>
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      {[
                        { label: "Bank Transfer", value: "bank" },
                        { label: "Cash", value: "cash" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField("paymentMode", opt.value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition border
                            ${
                              form.paymentMode === opt.value
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.paymentMode === "bank" && (
                      <Select
                        value={form.bankId}
                        onChange={(v) => setField("bankId", v)}
                        options={banks.map((b) => ({
                          value: b.id,
                          label: `${b.bank_name} — ${b.account_number}`,
                        }))}
                        placeholder="Select bank account..."
                        error={errors.bankId}
                      />
                    )}
                    {form.paymentMode === "cash" && (
                      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
                        💵 Cash Payment — no bank entry will be created
                      </div>
                    )}
                  </div>
                </FieldRow>
              </div>
            </section>

            {/* ══ SECTION 3: COST HEAD BREAK UP ══ */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full" />
                  <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                    Cost Head Break Up
                  </h4>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    costTotal === 100
                      ? "bg-emerald-100 text-emerald-700"
                      : costTotal > 100
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  Total: {costTotal}%{" "}
                  {costTotal === 100 ? "✓" : `(need ${100 - costTotal}% more)`}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-5 gap-3">
                  {COST_HEADS.map((head) => (
                    <div key={head}>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                        {COST_HEAD_LABELS[head]}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={form.costHeadBreakup[head]}
                          onChange={(e) => setCostHead(head, e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2.5 pr-7 text-sm text-center font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400
                            ${
                              errors.costHead
                                ? "border-red-300 bg-red-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-gray-500 font-medium text-xs">
                          %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual bar */}
                <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                  {COST_HEADS.map((head, i) => {
                    const colors = [
                      "bg-blue-400",
                      "bg-emerald-400",
                      "bg-orange-400",
                      "bg-purple-400",
                      "bg-gray-400",
                    ];
                    const pct = form.costHeadBreakup[head];
                    return pct > 0 ? (
                      <div
                        key={head}
                        className={`${colors[i]} transition-all duration-300`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                        title={`${COST_HEAD_LABELS[head]}: ${pct}%`}
                      />
                    ) : null;
                  })}
                </div>

                {errors.costHead && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.costHead}
                  </p>
                )}

                {/* Quick fill buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    {
                      label: "Set Ops 100%",
                      fn: () =>
                        setForm((p) => ({
                          ...p,
                          costHeadBreakup: {
                            ops: 100,
                            temp: 0,
                            recruitment: 0,
                            projects: 0,
                            others: 0,
                          },
                        })),
                    },
                    {
                      label: "Split equally",
                      fn: () => {
                        const each = Math.floor(100 / 5);
                        setForm((p) => ({
                          ...p,
                          costHeadBreakup: {
                            ops: each,
                            temp: each,
                            recruitment: each,
                            projects: each,
                            others: 100 - each * 4,
                          },
                        }));
                      },
                    },
                    {
                      label: "Reset",
                      fn: () =>
                        setForm((p) => ({
                          ...p,
                          costHeadBreakup: {
                            ops: 0,
                            temp: 0,
                            recruitment: 0,
                            projects: 0,
                            others: 0,
                          },
                        })),
                    },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={b.fn}
                      className="text-xs text-orange-600 hover:text-orange-800 underline"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ SECTION 4: ASSET FIELDS ══ */}
            <AnimatePresence>
              {isAssetPurchase && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                    <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                      Asset Details
                    </h4>
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                      Asset Purchase only
                    </span>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 divide-y divide-indigo-100">
                    <FieldRow label="Name of Person Issued">
                      <Input
                        value={form.issuedTo}
                        onChange={(v) => setField("issuedTo", v)}
                        placeholder="Employee name..."
                      />
                    </FieldRow>
                    <FieldRow label="Asset Warranty">
                      <Input
                        value={form.assetWarranty}
                        onChange={(v) => setField("assetWarranty", v)}
                        placeholder="e.g. 1 year, expires Dec 2026..."
                      />
                    </FieldRow>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* ══ SECTION 5: REMARKS ══ */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-gray-400 rounded-full" />
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
                  Remarks
                </h4>
              </div>
              <textarea
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 resize-none"
              />
            </section>

            {/* ── Billable Info Banner ── */}
            {form.isBillable && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-xs text-indigo-700 font-medium">
                  ✅ Billable Expense: The transfer amount (₹
                  {form.transferAmount || "0"}) will be{" "}
                  <strong>added to the invoice outstanding</strong> — the client
                  owes this amount.
                </p>
              </div>
            )}
            {!form.isBillable && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-500">
                  ℹ️ Non-Billable: Only the bank balance will be reduced.
                  Invoice outstanding is <strong>not affected</strong>.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
            <div className="text-xs text-gray-500">
              {costTotal === 100 ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cost head complete
                </span>
              ) : (
                <span className="text-amber-600">
                  ⚠ Cost head: {costTotal}% of 100%
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || saved}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 min-w-[140px] justify-center
                  ${
                    saved
                      ? "bg-emerald-500 text-white"
                      : "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60"
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> {editData ? "Update" : "Save"}{" "}
                    Expense
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  );
};

export default AddExpenseDetailsModal;
